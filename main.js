let isRunning = false; // Flag to track the script state
let ws; // Declare WebSocket outside to manage it globally
let intervalId; // To store the interval ID
let profitRate = 0.4; // Trade stake amount
let intervalTime = 3000; // Interval for requesting ticks history
let tradeCountsPerRun = null; // Number of history data points to fetch
let lastTradeId = null;

const button = document.getElementById('startWebSocket');
const apiToken = 'yubZ4jcrU2ffmgl'; // Replace with your actual API token
const output = document.getElementById('output'); // For displaying WebSocket messages
const totalResults = document.getElementById('totalResults'); // For displaying WebSocket messages
const results = document.getElementById('results'); // For displaying WebSocket messages
const percentage = document.getElementById('percentage'); // For displaying WebSocket messages
const marketOption = document.getElementById("marketOption");
const historyDataCount = 25; // Number of history data points to fetch
const ldpOpion = document.getElementById("ldp");
const stakeOpion = document.getElementById("stake");



ws = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089'); // Replace with your own app_id if needed
const marketArray = ['R_10', 'R_25', 'R_50', 'R_75', 'R_100'];

let totalProfitAmount = 0;
let totalLossAmount = 0;
let totalTradeCount = 0;
let winTradeCount = 0;
let lossTradeCount = 0;
let newProfit = 0 ;
let lossAmount = 0;
let winCountPerRow = 0;
let winCountPerRowLimit = 5;
let initialAccBalance = 0;
let percentageValue = percentage.value;
let selectedMarket = marketOption.value;
let ldp = ldpOpion.value;
let profitLimit = 0.1;
let lastTradeStatus = null;

// let interval = (60000 * 0.5);
let interval = (20000);

document.addEventListener("DOMContentLoaded", function(){
    if(document.getElementById("tradeOption").value == 'acmlt_1'){
        $(".sub").each(function() {
            $(this).addClass("hide");
        });
    }

    output.scrollTop = output.scrollHeight;
});


button.addEventListener('click', toggleWebSocket);

function toggleWebSocket() {
    // Get the selected option value
    var selectedOption = document.getElementById("tradeOption").value;
    stake = stakeOpion.value;
    // profitRate = (document.getElementById("rate").value / 100 );

    // Load the corresponding script based on the selected option
    loadScript(selectedOption);
}

function loadScript(option) {
    var script = document.createElement("script");
    script.type = "text/javascript";


    if (option === "rf_1") {
        script.src = "./scripts/rf_1_2.js";  // Path to your Rise & Fall script
    } else if (option === "ou_1") {
        script.src = "./scripts/ou_1.js";  // Path to your Accumulator script
    } else if (option === "ou_2") {
        // script.src = "./scripts/ou_2.js";  // Path to your Accumulator script
        script.src = "./new_scripts/overunder.js";  // Path to your Accumulator script
    } else if (option === "ou_3") {
        script.src = "./scripts/ou_3.js";  // Path to your Accumulator script
    } else if (option === "acmlt_1") {
        script.src = "./scripts/acmlt_1.js";  // Path to your Accumulator script
        // script.src = "./scripts/acmlt_2.js";  // Path to your Accumulator script
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
