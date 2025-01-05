//------------------------------------------------------------------------------
// Points
//------------------------------------------------------------------------------

let players = 4;
let winner = [];
const charArray = ["blue", "red", "yellow", "green"];
const maxRounds = 15;
const maxSelections = 4;
let isLoading = false;
let currentRound = 0;
let turnOrder = 0;
let playerInfo = {};
let anyDoorHasEffect = false;
let anyCharHasEffect = false;
let isLastDoorDisplayed = true;

// Gets number of forfeited players
const getForfeited = () => {
    return Object.keys(playerInfo).filter(
        (player) => playerInfo[player].lives <= 0
    ).length;
};
// Function which generates 'effect' for player - e.g modifyipler for points

const blameCallback = (playerId, points) => {
    const blamablePlayers = Object.keys(playerInfo)
        .filter((player) => playerInfo[player].lives > 0 && player !== playerId)
        .map((player) => playerInfo[player]);

    // Randomly select a player from the playablePlayersArr
    const randomPlayer =
        blamablePlayers[Math.floor(Math.random() * blamablePlayers.length)];

    // Deduct points from the selected player
    randomPlayer.points -= points;
    setTimeout(() => {
        displayScore(randomPlayer.id, false, `Blamed: -${points}`);
    }, 2000);
};

const blessCallback = (playerId, points) => {
    // Applies triple modifier in addition to base modifier
    const score = Math.round(
        points * 3 * playerInfo[playerId].effect.modifier.points
    );
    playerInfo[playerId].points += score;
    displayScore(playerId, true, score);
};

const greedCallback = (doorId) => {
    const door = document.querySelector(`#door-${doorId + 1}`);
    door.classList.add("effect-greed");
};

const jokerCallBack = (doorId) => {
    const door = document.querySelector(`#door-${doorId + 1}`);
    door.classList.add("effect-joker");
    const currentOdd = doors[doorId].odds;
    doors[doorId].odds = 100 - currentOdd;

    const rewardOdds = document.querySelector(
        `#door-${doorId + 1} .reward .odds`
    );
    rewardOdds.innerHTML = 100 - currentOdd;
    const riskOdds = document.querySelector(`#door-${doorId + 1} .risk .odds`);
    riskOdds.innerHTML = currentOdd;
};

const ejectorCallback = (doorId, playerId) => {
    // Adds visual effect to the door
    const door = document.querySelector(`#door-${doorId + 1}`);
    door.classList.add("effect-ejector");

    // Get list of players who are at the selected door not including the player who triggered the effect
    const playersAtDoor = Object.keys(playerInfo)
        .filter(
            (player) =>
                playerInfo[player].selection === doorId &&
                playerInfo[player].id !== playerId &&
                playerInfo[player].selection === doorId
        )
        .map((player) => playerInfo[player]);

    if (playersAtDoor.length === 0) {
        return;
    }

    // Resets all characters inside the selected door, places the triggered player inside
    const container = document.querySelector(
        `#door-${doorId + 1} .selected-char-container`
    );
    container.innerHTML = ""; // Clear current characters
    displayCharOnDoor(doorId + 1, playerId);

    // Randomly assigns players to a selected door besides the current door
    playersAtDoor.forEach((player) => {
        let newDoor;
        if (isLastDoorDisplayed) {
            newDoor = Math.floor(Math.random() * doors.length); // Select from all doors
        } else {
            newDoor = Math.floor(Math.random() * (doors.length - 1)); // Exclude last door
        }
        // Ensure the selected door is not the same as the current door
        if (newDoor >= doorId) {
            newDoor++; // Skip the current door
        }

        // Check if the new door exceeds the bounds, if so, reset to 0
        if (newDoor === doors.length) {
            newDoor = 0;
        }

        player.selection = newDoor;
        // Places player on the new door (DOM)
        displayCharOnDoor(newDoor + 1, player.id);
    });
};

const getEffect = (playerId) => {
    const effects = [
        {
            name: "Ejector",
            type: "door",
            expires: currentRound + 3,
            description:
                "Ejects players from the selected door and randomly places them elsewhere!",
            callback: ejectorCallback,
        },
        {
            name: "greed",
            type: "door",
            expires: currentRound + 5,
            description: "Subsequent players cannot select your door!",
            callback: greedCallback,
        },
        {
            name: "joker",
            type: "door",
            expires: currentRound + 3,
            description: "Reverses the odds of your door!",
            callback: jokerCallBack,
        },
        {
            name: "blame",
            type: "risk effect",
            expires: currentRound + 3,
            description:
                "When you lose points, randomly assign someone else to lose the points instead!",
            callback: blameCallback,
        },
        {
            name: "bless",
            type: "reward",
            expires: currentRound + 3,
            description: "Gain Triple points!",
            callback: blessCallback,
        },
    ];
    const odds = Math.floor(Math.random() * 100);

    // Determines the effect type
    let effectType = "";
    if (odds < 33) {
        effectType = "points";
    } else if (odds >= 33 && odds < 66) {
        effectType = "odds";
    } else if (odds >= 66) {
        effectType = "effect";
    }

    // Hanles the effect type
    if (effectType === "points") {
        const prevmodify = playerInfo[playerId].effect.modifier.points * 1 || 1;
        const modify = Math.max(0.2, (Math.random() * 0.5).toFixed(2) * 1);
        playerInfo[playerId].effect.modifier.points = modify; // Store the modifier

        // Update the DOM with the new modifier
        const modifyPoints = document.querySelector(
            `#modifyPoints-${charArray[playerId]}`
        );
        modifyPoints.classList.remove("display-none");
        modifyPoints.innerHTML = Number(prevmodify + modify).toFixed(2);
    } else if (effectType === "odds") {
        const prevAddition = playerInfo[playerId].effect.modifier.odds * 1 || 0;
        const addition = (Math.random() * 15).toFixed(2) * 1;
        playerInfo[playerId].effect.modifier.odds += addition;

        // Update the DOM with the new addition
        const modifyOdds = document.querySelector(
            `#modifyOdds-${charArray[playerId]}`
        );
        modifyOdds.classList.remove("display-none");
        modifyOdds.innerHTML = Number(prevAddition + addition).toFixed(2);
    } else if (effectType === "effect" || effectType.includes("effect")) {
        anyCharHasEffect = true;
        const chosenEffect =
            effects[Math.floor(Math.random() * effects.length)];

        // Check if the effect is already in the player's effect list
        if (
            playerInfo[playerId].effect.effect.some(
                (effect) => effect.name === chosenEffect.name
            )
        ) {
            playerInfo[playerId].effect.effect = playerInfo[
                playerId
            ].effect.effect.filter(
                (effect) => effect.name !== chosenEffect.name
            );
        }
        playerInfo[playerId].effect.effect.push(chosenEffect);
        displayScore(playerId, true, `${chosenEffect.name} Effect`);

        // Update the DOM with the new effects
        const effectsContainer = document.querySelector(
            `#effects-${charArray[playerId]}`
        );
        const allEffects = playerInfo[playerId].effect.effect
            .map((e) => {
                return `
                <div class="effects">
                    <div class="effect">
                        <div>${e.name}</div>
                        <div class="effect-label">${e.description}<br><br>Expires round ${e.expires}</div>
                    </div>
                </div>
            `;
            })
            .join("");

        effectsContainer.innerHTML = allEffects;
    }
};

const applyEffect = (playerId, points, effectType) => {
    const player = playerInfo[playerId];
    const effect = player.effect.effect.filter(
        (e) => e.type === effectType || e.type.includes(effectType)
    );
    if (effectType === "reward" || effectType.includes("reward")) {
        if (effect.length > 0) {
            // Call the corresponding effect callback
            effect.forEach((e) => e.callback(playerId, points));
        } else {
            const modifier = player.effect.modifier.points || 1;
            displayScore(playerId, true, Math.round(points * modifier));
            player.points += Math.round(points * modifier); // Apply modifier
        }
    } else if (effectType === "risk" || effectType.includes("risk")) {
        if (effect.length > 0) {
            // Call the corresponding effect callback
            effect.forEach((e) => e.callback(playerId, points));
        } else {
            // min lives at 0
            playerInfo[playerId].lives = Math.max(
                playerInfo[playerId].lives - 1,
                0
            );
            displayScore(playerId, false, points);
            player.points -= points;
        }
    }
};

// -----------------------------------------------------------------------------
// Game Logic
// -----------------------------------------------------------------------------

// Sets starting lives,points for players
function setPlayers(num) {
    players = num;
    playerInfo = {};
    for (let i = 0; i < players; i++) {
        playerInfo[i] = {
            id: i,
            lives: 3,
            points: 0,
            effect: { modifier: { points: 1, odds: 0 }, effect: [] },
            turn: 0,
            selection: 0,
        };
    }
    // Resets all characters then imports them into the DOM
    for (let i = 0; i < charArray.length; i++) {
        document.querySelector(
            `#characterGroup .player-${i + 1} .char-${charArray[i]}`
        ).innerHTML = "";
    }

    for (let i = 0; i < players; i++) {
        loadComponents(
            `#characterGroup .char-${charArray[i]}`,
            `./layouts/characters/${charArray[i]}.html`
        );
    }
}

function resetEffectLabels() {
    // Resets all effects inside DOM
    for (let i = 0; i < players; i++) {
        document.querySelector(
            `#characterGroup .player-${i + 1} .effects`
        ).innerHTML = "";
        document
            .querySelector(`#characterGroup .player-${i + 1} .modifyPoints`)
            .classList.add("display-none");
        document
            .querySelector(`#characterGroup .player-${i + 1} .modifyOdds`)
            .classList.add("display-none");
    }
}

// Shuffles turn order of players
function shuffleTurnPick() {
    let pickOrders = Object.keys(playerInfo)
        .filter((player) => playerInfo[player].lives > 0)
        .map((_, i) => i);

    for (let i = pickOrders.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (pickOrders.length - 1));
        [pickOrders[i], pickOrders[j]] = [pickOrders[j], pickOrders[i]];
    }
    Object.keys(playerInfo).forEach((player) => {
        playerInfo[player].turn =
            playerInfo[player].lives > 0 ? pickOrders.splice(0, 1)[0] : -1;
    });
}

// -----------------------------------------------------------------------------
// Lives - Lose 3 lives in a row, game over. Lives reset on successful round.
// -----------------------------------------------------------------------------
const livesElement = (col) => `<div class="bg-${col} lives"></div>`;

function updateLives() {
    for (let i = 0; i < Object.keys(playerInfo).length; i++) {
        if (playerInfo[i].lives === -1) {
            continue;
        }
        document.querySelector(`#lives-${charArray[i]}`).innerHTML = Array(
            playerInfo[i].lives
        )
            .fill()
            .map((_) => livesElement(charArray[i]))
            .join("");
    }
}

//------------------------------------------------------------------------------
// Door Values - Random assign reward, reward odds, risk, risk odds
//------------------------------------------------------------------------------

const doors = [
    { reward: 0, risk: 0, effect: false, odds: 0 },
    { reward: 0, risk: 0, effect: false, odds: 0 },
    { reward: 0, risk: 0, effect: false, odds: 0 },
    { reward: 0, risk: 0, effect: false, odds: 0 },
    { reward: 0, risk: 0, effect: false, odds: 0 },
];

// Reward modifier based on risk
function easeInQuad(x) {
    return x * x;
}

// Assigns values to doors, then updates the DOM with those values
function updateDoors() {
    doors.forEach((door) => {
        door.odds = Math.max(20, Math.floor(Math.random() * 100));
        door.reward = Math.floor(easeInQuad(100 - door.odds));
        door.risk = Math.floor(
            easeInQuad(door.odds) * (0.6 + Math.random() * 0.5)
        );
        door.effect = Math.floor(Math.random() * 100) < 50;
    });

    doors.forEach((door, index) => {
        const rewardElement = document.querySelector(
            `#door-${index + 1} .reward .amount`
        );
        const riskElement = document.querySelector(
            `#door-${index + 1} .risk .amount`
        );
        const rewardOddsElement = document.querySelector(
            `#door-${index + 1} .reward .odds`
        );
        const riskOddsElement = document.querySelector(
            `#door-${index + 1} .risk .odds`
        );
        const effectElement = document.querySelector(
            `#door-${index + 1} .effect-container`
        );

        // Check if the element exists before updating innerHTML
        if (rewardElement) {
            rewardElement.innerHTML = door.reward;
        }
        if (riskElement) {
            riskElement.innerHTML = door.risk;
        }
        if (rewardOddsElement) {
            rewardOddsElement.innerHTML = door.odds;
        }
        if (riskOddsElement) {
            riskOddsElement.innerHTML = 100 - door.odds;
        }
        if (effectElement && door.effect) {
            effectElement.innerHTML = `<div class="icon-effect"></div>`;
            loadComponents(
                `#door-${index + 1} .icon-effect`,
                `./layouts/icons/effect.html`
            );
        } else {
            effectElement.innerHTML = "";
        }
    });
}

// ------------------------------------------------------------------------------
// Door Selection
// ------------------------------------------------------------------------------
function selectDoor(doorId) {
    if (isLoading) {
        return;
    }
    const forfeited = getForfeited();

    const playablePlayers = players - forfeited;
    const playerTurn = turnOrder % playablePlayers || 0;
    const nextPlayerTurn = (turnOrder + 1) % playablePlayers;
    let currentPlayerId = 0;
    let nextPlayerId = 0;
    Object.keys(playerInfo).forEach((player) => {
        if (playerInfo[player].turn === playerTurn) {
            playerInfo[player].selection = doorId;
            // Adds character icon to door - displays selection for remaining round
            displayCharOnDoor(doorId + 1, playerInfo[player].id);
            currentPlayerId = playerInfo[player].id;
        }
        if (playerInfo[player].turn === nextPlayerTurn) {
            nextPlayerId = playerInfo[player].id;
        }
    });

    // If player has 'door' effect or 'odds' modifier, update the door (and DOM) with that effect/modifier
    if (
        playerInfo[currentPlayerId].effect.effect.length > 0 &&
        playerInfo[currentPlayerId].effect.effect.some(
            (item) => item.type === "door"
        )
    ) {
        const effect = playerInfo[currentPlayerId].effect.effect.find(
            (item) => item.type === "door"
        );
        effect.callback(doorId, currentPlayerId);
        anyDoorHasEffect = true;
    }
    if (playerInfo[currentPlayerId].effect.modifier.odds > 0) {
        const oddsModifer = playerInfo[currentPlayerId].effect.modifier.odds;
        const newOdds = Math.round(doors[doorId].odds + oddsModifer);
        doors[doorId].odds = Math.min(100, newOdds);
        const doorPosOdds = document.querySelector(
            `#door-${doorId + 1} .reward .odds`
        );
        doorPosOdds.innerHTML = doors[doorId].odds;
        const doorNegOdds = document.querySelector(
            `#door-${doorId + 1} .risk .odds`
        );
        doorNegOdds.innerHTML = 100 - doors[doorId].odds;
    }

    // Calculates scores of round once all selections made
    if (playerTurn === playablePlayers - 1) {
        isLoading = true;
        resetGreyed();
        refreshDoorEffects();
        calculateRound();
        setTimeout(() => {
            clearCharOnDoor();
            isLoading = false;
        }, 1000);
    } else {
        updateSelected(nextPlayerId);
    }
    turnOrder++;
}

// resets visual effect on door when round ends
const refreshDoorEffects = () => {
    if (!anyDoorHasEffect) return;
    const doors = document.querySelectorAll(".door");
    doors.forEach((door) => {
        door.className = "door";
    });
    anyDoorHasEffect = false;
};

// Checks for expired effects
const checkExpiredEffects = () => {
    if (!anyCharHasEffect) return;
    let noEffects = 0;
    for (let i = 0; i < players; i++) {
        const player = playerInfo[i];
        if (player.effect.effect.length > 0) {
            const effect = player.effect.effect.find(
                (item) => item.expires < currentRound
            );
            if (effect) {
                player.effect.effect = player.effect.effect.filter(
                    (item) => item.expires >= currentRound
                );
            }
            // Resets DOM
            const effectsContainer = document.querySelector(
                `#characterGroup .player-${i + 1} .effects`
            );
            if (player.effect.effect.length === 0) {
                effectsContainer.innerHTML = "";
                noEffects++;
                continue;
            }
            const remainingEffects = player.effect.effect
                .map((item) => {
                    return `
                            <div class="effects">
                                <div class="effect">
                                    <div>${item.name}</div>
                                    <div class="effect-label">${item.description} <br><br/> Expires round ${item.expires}</div>
                                </div>
                            </div>
                        `;
                })
                .join("\n");
            effectsContainer.innerHTML = remainingEffects;
        } else {
            noEffects++;
        }
    }
    if (noEffects === players) {
        anyCharHasEffect = false;
    }
};

// When user clicks on door, their character is displayed on that door
async function displayCharOnDoor(doorId, charId) {
    const container = document.querySelector(
        `#door-${doorId} .selected-char-container`
    );
    const char = `
            <div class="char-${charArray[charId]}"></div>
        `;
    container.insertAdjacentHTML("beforeend", char);

    await loadComponents(
        `#door-${doorId} .char-${charArray[charId]}`,
        `./layouts/characters/${charArray[charId]}.html`
    );
}

function clearCharOnDoor() {
    const doors = document.querySelectorAll(".door");
    doors.forEach((door) => {
        door.querySelector(".selected-char-container").innerHTML = "";
    });
}

// Function which tells player which player's turn it is (making their character focused)
function updateSelected(selectedId) {
    // If selectedId is -1, this tells function that new round has started, and to select first player of the new pick order
    if (selectedId === -1) {
        const firstPick = Object.values(playerInfo).find(
            (player) => player.turn === 0
        );
        selectedId = firstPick.id;
    }
    // Current Character turn State
    const allGroups = document.querySelectorAll("#characterGroup .character");
    allGroups.forEach((group) => group.classList.remove("selected"));
    const playerClass = `player-${selectedId + 1}`;
    const playerElement = document.querySelector(
        `#characterGroup .${playerClass}`
    );

    if (playerElement) {
        playerElement.classList.add("greyed", "selected");
    }
}

// Resets picked state at start of new round
function resetGreyed() {
    const allGroups = document.querySelectorAll("#characterGroup .character");
    allGroups.forEach((group) => group.classList.remove("greyed"));
}

// Resets door results at start of new round
function resetsDoorResults() {
    const doors = document.querySelectorAll(".door");
    doors.forEach((door) => {
        door.classList.remove("door-reward");
        door.classList.remove("door-risk");
    });
}

// Randomly displays last door or not ( so each round either has 3 or 4 doors)
function displayLastDoor() {
    const door = document.querySelector("#door-4");
    if (door) {
        if (Math.random() > 0.7) {
            isLastDoorDisplayed = false;
            door.classList.add("display-none");
        } else {
            isLastDoorDisplayed = true;
            door.classList.remove("display-none");
        }
    }
}
// Resets player selections
const resetPlayerSelections = () => {
    Object.keys(playerInfo).forEach((player) => {
        playerInfo[player].selection = -1;
    });
};

// Updates round text at header
function updateRound() {
    currentRound++;
    document.querySelector("#round-current").innerHTML = currentRound;
}

// Updates points for each player
function updatePoints() {
    for (let i = 0; i < Object.keys(playerInfo).length; i++) {
        document.querySelector(`#points-${charArray[i]}`).innerHTML =
            playerInfo[i].points;
    }
}
// Function displaying score in player score container
function displayScore(playerId, isReward, score) {
    const playerScoreContainer = document.querySelector(
        `#characterGroup .player-${playerId * 1 + 1} .round-score-value`
    );
    playerScoreContainer.innerHTML = score;

    if (isReward) {
        playerScoreContainer.classList.add("animate-reward");
        setTimeout(() => {
            playerScoreContainer.classList.remove("animate-reward");
        }, 3000);
    } else {
        playerScoreContainer.classList.add("animate-risk");
        setTimeout(() => {
            playerScoreContainer.classList.remove("animate-risk");
        }, 2500);
    }
}

// Calculates round results
async function calculateRound() {
    turnOrder = -1;
    if (currentRound >= maxRounds) {
        showWinner();
        return;
    }

    doors.forEach((door, index) => {
        const selectedPlayers = Object.keys(playerInfo).filter((player) => {
            return playerInfo[player].selection === index;
        });

        const currentOdd = Math.floor(Math.random() * 100);
        const isReward = currentOdd <= door.odds;

        // Displays results of door selection on door
        const doorContainer = document.querySelector(`#door-${index + 1}`);

        isReward
            ? doorContainer.classList.add("door-reward")
            : doorContainer.classList.add("door-risk");

        if (selectedPlayers.length === 0) {
            return;
        }

        selectedPlayers.forEach((player) => {
            if (isReward) {
                // max lives at 3
                playerInfo[player].lives = Math.min(
                    playerInfo[player].lives + 1,
                    3
                );
                // apply reward effect
                if (door.effect) {
                    getEffect(player, door.reward, "reward");
                } else {
                    applyEffect(player, door.reward, "reward");
                }
            } else {
                // apply risk effect / lose points
                applyEffect(player, door.risk, "risk");
            }
        });
    });

    const forfeited = getForfeited();
    isLoading = true;
    setTimeout(() => {
        if (forfeited === players - 1 && players > 1) {
            showWinner();
            return;
        }
        if (forfeited === players) {
            showLose();
            return;
        }

        resetsDoorResults();
        updateRound();
        updateDoors();
        updateLives();
        updatePoints();
        shuffleTurnPick();
        updateSelected(-1);
        displayLastDoor();
        checkExpiredEffects();
        refreshDoorEffects();
        resetPlayerSelections();
        isLoading = false;
    }, 2500);
}

// Shows winner of game
async function showWinner() {
    await loadComponents("#victoryScreen", "./layouts/victoryScreen.html");
    for (let player in playerInfo) {
        if (playerInfo[player].lives <= 0) {
            continue;
        }
        if (winner.length === 0) {
            winner[0] = playerInfo[player];
            continue;
        }
        if (playerInfo[player].points > winner[0].points) {
            winner = [];
            winner[0] = playerInfo[player];
        } else if (playerInfo[player].points === winner[0].points) {
            winner.push(playerInfo[player]);
        }
    }
    const winnersContainer = winner
        .map((item) => {
            return `
            <div class="char-${charArray[item.id]}"></div>`;
        })
        .join("\n");

    document.querySelector("#winner-winner").innerHTML =
        winner.length > 1
            ? charArray
                  .map((item) => item[0].toUpperCase() + item.slice(1))
                  .join(", ")
            : charArray[winner[0].id][0].toUpperCase() +
              charArray[winner[0].id].slice(1);
    document.querySelector("#winner-character").innerHTML = winnersContainer;
    document.querySelector("#winner-points").innerHTML = winner[0].points;

    const promises = winner.map((item) => {
        return loadComponents(
            `.char-${charArray[item.id]}`,
            `./layouts/characters/${charArray[item.id]}.html`
        );
    });
    await Promise.all(promises);
}
// Shows lost screen
async function showLose() {
    await loadComponents("#loseScreen", "./layouts/loseScreen.html");
}

// Sets number of players in game
function setActivePlayers(players) {
    currentRound = 0;
    setPlayers(players);
    resetEffectLabels();
    shuffleTurnPick();
    updateLives();
    updatePoints();
    updateRound();
    updateDoors();
    updateSelected(-1);
    resetGreyed();
}

// Restarts game
function restartGame() {
    document.querySelector("#victoryScreen").innerHTML = "";
    document.querySelector("#loseScreen").innerHTML = "";
    resetEffectLabels();
    startGame();
}

//------------------------------------------------------------------------------
// Game Start
//------------------------------------------------------------------------------

function startGame() {
    currentRound = 0;
    setPlayers(4);
    resetEffectLabels();
    shuffleTurnPick();
    updateLives();
    updatePoints();
    updateRound();
    updateDoors();
    updateSelected(-1);
}
