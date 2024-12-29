// import { setTimer } from './common_scripts.js';

// const apiToken = 'lkUxtOopvUhCpIX'; // kunkumagp
// const apiToken = 'yubZ4jcrU2ffmgl'; // kunkumatrading
const apiToken = '8a4P686A4ULP96O'; // whkgprasanna85


const marketElements = document.querySelectorAll(".market");
const startButton = document.getElementById('startWebSocket');
const activeElement = Array.from(marketElements).find(el => el.classList.contains("active"));

let isRunning = false;
let ws, market, intervalId, initialAccBalance = 0;

market = activeElement.id
ws = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089'); // Replace with your own app_id if needed


// Add a click event listener to each element
marketElements.forEach(element => {
    element.addEventListener("click", () => {
        // Remove the "active" class from all elements
        marketElements.forEach(el => el.classList.remove("active"));

        // Add the "active" class to the clicked element
        element.classList.add("active");
        market = element.id

        console.log('market - ', market);

    });
});

startButton.addEventListener('click', toggleWebSocket);

function toggleWebSocket(){
    runAccumulatorScript();
};




function runAccumulatorScript() {
    if (isRunning) {
        // Stop the loop and close the WebSocket
        webSocketConnectionStop();
    } else {
        // Start the loop and open the WebSocket
        webSocketConnectionStart();
    }
}

function webSocketConnectionStart(){
    isRunning = true;
    startWebSocket();
    console.log('WebSocket connection started.');
    document.getElementById('output').textContent += 'WebSocket connection started.\n';
    startButton.innerHTML = "Stop WebSocket";
};

function webSocketConnectionStop(){
    isRunning = false;
    clearInterval(intervalId); // Stop the interval loop
    if (ws) {
        ws.close();
        ws = null;
    }
    console.log('WebSocket connection stopped.');
    document.getElementById('output').textContent += 'WebSocket connection stopped.\n';
    startButton.innerHTML = "Start WebSocket";
};


function startWebSocket() {
    console.log('market - ', market);

    ws.onopen = function () {
        // Authenticate
        getAuthentication();
        output.innerHTML += 'WebSocket connection opened.\n-------------------------------------\n';
    };

    ws.onclose = function () {
        console.log('Connection closed');
        output.innerHTML += 'Connection closed\n-----------------------------\n\n';
        console.log('-----------------------------\n');
    };

    ws.onerror = function (err) {
        console.error('WebSocket error:', err);
        output.innerHTML += `WebSocket error: ${err.message}\n`;
    };


    ws.onmessage = function (event) {
        const response = JSON.parse(event.data);
        console.log('response - ', response);

        if (response.msg_type === 'authorize') {
            console.log('Authorization successful.');
            initialAccBalance = response.authorize.balance;
            document.getElementById('initialAccBalance').innerHTML = initialAccBalance;
            // makeTrades();
            // setTimer(10000);


        }

    };




    // Functions

    const getAuthentication = () => {
        
        ws.send(JSON.stringify({
            authorize: apiToken
        }));
    }

    const tickPicker = () => {
        
    };

};
