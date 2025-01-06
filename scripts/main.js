function loadComponents(selector, file) {
    return new Promise((resolve, reject) => {
        fetch(file)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Error loading ${file}`);
                }
                return response.text();
            })
            .then((data) => {
                if (selector.includes("#")) {
                    document.querySelector(selector).innerHTML = data;
                    resolve();
                } else if (selector.includes(".")) {
                    document.querySelectorAll(selector).forEach((element) => {
                        element.innerHTML = data;
                    });
                    resolve();
                }
            })
            .catch((error) => {
                console.error(error);
                reject();
            });
    });
}

// Array of all components to load
const components = [
    loadComponents("#roundInfo", "./layouts/roundInfo.html"),
    loadComponents("#characterGroup", "./layouts/characterGroup.html"),
    loadComponents("#doorGroup", "./layouts/doors.html"),
    loadComponents(
        "#toggleAdjustPlayers",
        "./layouts/toggleAdjustPlayers.html"
    ),
    loadComponents(".icon-cash", "./layouts/icons/cash.html"),
    loadComponents(".icon-risk", "./layouts/icons/risk.html"),
    loadComponents(".icon-effect", "./layouts/icons/effect.html"),
    loadComponents("#toggleRules", "./layouts/toggleRules.html"),
];

// Wait for all components to load before calling startGame
Promise.all(components)
    .then(() => {
        startGame();
    })
    .catch((error) => {
        console.error("Error loading components:", error);
    });

// Open Modals
function openAdjustPlayersModal() {
    console.log("open");
    loadComponents("#adjustPlayers", "./layouts/adjustPlayers.html");
}

function closeAdjustPlayersModal() {
    document.querySelector("#adjustPlayers").innerHTML = "";
}

function openRulesModal() {
    loadComponents("#rules", "./layouts/rules.html");
}

function closeRulesModal() {
    document.querySelector("#rules").innerHTML = "";
}
