let isRunning = false; // Flag to track the script state
let ws; // Declare WebSocket outside to manage it globally
let intervalId; // To store the interval ID
let stake = 1; // Trade stake amount
let intervalTime = 3000; // Interval for requesting ticks history
let tradeCountsPerRun = 10; // Number of history data points to fetch
let market = 'R_10'; // Volatility 10 Index 1s

const button = document.getElementById('startWebSocket');
const apiToken = 'yubZ4jcrU2ffmgl'; // Replace with your actual API token
const output = document.getElementById('output'); // For displaying WebSocket messages
const totalResults = document.getElementById('totalResults'); // For displaying WebSocket messages
const results = document.getElementById('results'); // For displaying WebSocket messages
const historyDataCount = 25; // Number of history data points to fetch

button.addEventListener('click', toggleWebSocket);

function toggleWebSocket() {
    // Get the selected option value
    var selectedOption = document.getElementById("tradeOption").value;
    var marketOption = document.getElementById("marketOption").value;

    // Load the corresponding script based on the selected option
    loadScript(selectedOption, marketOption);
}

function loadScript(option, marketOption) {
    var script = document.createElement("script");
    script.type = "text/javascript";

    market = marketOption;

    if (option === "rf_1") {
        script.src = "./scripts/rf_1_2.js";  // Path to your Rise & Fall script
    } else if (option === "ou_1") {
        script.src = "./scripts/ou_1.js";  // Path to your Accumulator script
    } else if (option === "ou_2") {
        script.src = "./scripts/ou_2.js";  // Path to your Accumulator script
    } else if (option === "ou_3") {
        script.src = "./scripts/ou_3.js";  // Path to your Accumulator script
    } else if (option === "acmlt_1") {
        script.src = "./scripts/acmlt_1.js";  // Path to your Accumulator script
    } else if (option === "md_1") {
        script.src = "./scripts/md_1.js";  // Path to your Accumulator script
    }

    // Append the script to the document
    script.onload = function() {
        console.log("Script loaded and ready.");
    };
    script.onerror = function() {
        console.error("Error loading the script.");
    };
    document.body.appendChild(script);
}

const requestTicksHistory = (symbol, historyDataCount) => {
    const ticksHistoryRequest = {
        ticks_history: symbol,
        end: 'latest',
        count: historyDataCount, // Increased count for a larger dataset (more ticks for better prediction)
        style: 'ticks'
    };
    ws.send(JSON.stringify(ticksHistoryRequest));
};