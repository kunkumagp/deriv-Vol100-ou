// import { setTimer } from './common_scripts.js';

// const apiToken = 'lkUxtOopvUhCpIX'; // kunkumagp
// const apiToken = 'yubZ4jcrU2ffmgl'; // kunkumatrading
const apiToken = 'iVOpdm24hBhw3JI'; // whkgprasanna85


const marketElements = document.querySelectorAll(".market");
const startButton = document.getElementById('startWebSocket');
const signalDiv = document.getElementById('signal');
const activeElement = Array.from(marketElements).find(el => el.classList.contains("active"));
const totalResults = document.getElementById('totalResults');

let isRunning = false, isTradeOpen = false;
let initialStake = 1;
let initialTickCountdown = 11;

let ws, 
    market, 
    intervalId, 
    initialAccBalance = 0, 
    totalTradeCount = 0,
    previousTickValue = null, 
    currentTickValue = null, 
    tickCount = null, 
    upCount = null, 
    downCount = null, 
    lastTradeId = null,
    signal = null,
    callTrade = null,
    newProfit = 0,
    initAccBalance = 0,
    totalProfitAmount = 0,
    totalLossAmount = 0,
    winTradeCount = 0,
    lossTradeCount = 0,
    lossAmount = 0,
    lostCountInRow = 0,
    putTrade = null
;
let stakeForTrade = initialStake;
let tickCountdown = initialTickCountdown;

market = activeElement.id


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
    runScript();
};




function runScript() {
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
    ws = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089'); // Replace with your own app_id if needed

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

        if (response.msg_type === 'authorize') {
            console.log('Authorization successful.');
            initialAccBalance = response.authorize.balance;
            document.getElementById('initialAccBalance').innerHTML = initialAccBalance;
            // makeTrades();
            // setTimer(10000);
            
            // placeRiseFallTrade('CALL', stakeForTrade);

            // placeRiseFallTrade('CALL', 1.0);
            startTicks();
        }

        if (response.msg_type === 'tick') {
            const tickValue = response.tick.quote;

            // Check if the response contains the subscription ID
            if (response.subscription && response.subscription.id) {
                subscriptionId = response.subscription.id; // Store the subscription ID
                // console.log("Subscribed with ID:", subscriptionId);
            }

            // console.log('tickValue - ', tickValue);
            tickPicker(tickValue);
        };

        if (response.msg_type === 'proposal') {
            makeTheTrade(response);

            
            // if(response.echo_req.contract_type == "CALL"){
            //     callTrade = response;
            // } else if(response.echo_req.contract_type == "PUT"){
            //     putTrade = response;
            // }

            // if(callTrade != null && putTrade == null){
            //     // placeRiseFallTrade('PUT', stakeForTrade);
            // } else if(callTrade != null && putTrade != null){
            //     // startTicks();
            // }

        };


        if (response.msg_type === 'buy') {
            console.log('Trade Successful:', response);
            // console.log('Signal :', signal);
            lastTradeId = response.buy.contract_id; // Save the trade's contract ID
            output.innerHTML += `Trade started:\nContract ID = ${lastTradeId}, Stake = ${response.buy.buy_price}, trade = <span style="color: ${signal == 'PUT' ? 'red' : 'green'}; font-weight: 900;">${signal == 'PUT' ? 'Fall' : 'Rise'}</span>, Market = ${market}\n`;
            totalTradeCount = totalTradeCount + 1
            isTradeOpen = true;
            // console.log('Contract id - ',lastTradeId);
            setTimeout(() => {fetchTradeDetails(lastTradeId);}, 1000);
        }

        if(response.msg_type === 'proposal_open_contract'){
            if(response.proposal_open_contract.contract_id === lastTradeId){
                const contract = response.proposal_open_contract;
                
                if (contract.is_sold) {
                    const profit = contract.profit;
                    const result = profit > 0 ? 'Win' : 'Loss';

                    output.innerHTML += `Trade Result: <span style="color: ${profit > 0 ? 'green' : 'red'}; font-weight: 900;">${result}</span>, Profit: <span style="color: ${profit > 0 ? 'green' : 'red'}; font-weight: 900;">$${profit.toFixed(2)}</span>\n-------------------------------------\n`;


                    if( profit > 0){
                        totalProfitAmount = totalProfitAmount + profit;
                        winTradeCount = winTradeCount+1;  
                        lostCountInRow = 0;
                    } else {
                        totalLossAmount = totalLossAmount + profit;
                        lossTradeCount = lossTradeCount+1;
                        lostCountInRow = lostCountInRow + 1;
                    }
                    lossAmount = lossAmount + profit
                    if(lossAmount > 0){lossAmount = 0;}

                    newProfit = totalProfitAmount + totalLossAmount;
                    const spanColor = newProfit > 0 ? 'green' : 'red';
                    reportUpdate(totalTradeCount, winTradeCount, lossTradeCount, totalProfitAmount, totalLossAmount, lossAmount, newProfit, initialAccBalance);


                    signalMessage('Wait for another trade...');


                    isTradeOpen = false;
                    stakeChange(result);

                    
                    setTimeout(() => {
                        reset();
                    }, lostCountInRow >= 2 ? 10000 : 3000);

                } else { setTimeout(() => {fetchTradeDetails(lastTradeId);}, 2000); }

            };
        };

    };




    // Functions

    const reset = () => {
        callTrade = null;
        putTrade = null;
        tickCountdown = initialTickCountdown;
        upCount = null;
        downCount = null;
        tickCount = null;
        currentTickValue = null;
        previousTickValue = null;
        signalMessage('Preparing proposals...');
        startTicks();
        // placeRiseFallTrade('CALL', stakeForTrade);

    };

    const stakeChange = (status) => {
        if(status == "Loss"){
            stakeForTrade = stakeForTrade * 2.1;
        } else if(status == "Win"){
            stakeForTrade = initialStake;
        }
        
    };

    const getAuthentication = () => {
        
        ws.send(JSON.stringify({
            authorize: apiToken
        }));
    }

    // Subscribe to tick updates
    const startTicks = () => {
        ws.send(JSON.stringify({
            ticks: market,
            subscribe: 1,
        }));
    };
    
    // Unsubscribe to tick updates
    const stopTicks = () => {
        ws.send(JSON.stringify({
            forget: subscriptionId, // Use the stored subscription ID
        }));
    };

    const tickPicker = (tickValue) => {

        if(previousTickValue == null && currentTickValue == null){
            currentTickValue = tickValue;
        } else if(previousTickValue == null && currentTickValue != null || previousTickValue != null && currentTickValue != null){
            if(tickCount < 10){
                previousTickValue = currentTickValue;
                currentTickValue = tickValue;

                tickCountdown = tickCountdown - 1;

                signalMessage(`Signal will be generate in <span style="font-weight: 900;">${tickCountdown}</span> ticks.`);

                if(previousTickValue < currentTickValue){
                    upCount = upCount + 1;
                    console.log('UP');
                } else if(previousTickValue > currentTickValue){
                    downCount = downCount + 1;
                    console.log('DOWN');
                }

                tickCount = tickCount + 1;
            } else if(tickCount == 10){
                console.log('upCount - ', upCount);
                console.log('downCount - ', downCount);
                console.log('tickCount - ', tickCount);
                stopTicks();

            // 


                if(upCount < downCount){
                    console.log('SELL');
                    signal = 'PUT';
                    signalMessage('SELL');
                    // makeTheTrade(putTrade, currentTickValue);
                    placeRiseFallTrade('PUT', stakeForTrade);
                } else if(upCount > downCount){
                    console.log('BUY');
                    signal = 'CALL';
                    signalMessage('BUY');
                    // makeTheTrade(callTrade, currentTickValue);
                    placeRiseFallTrade('CALL', stakeForTrade);
                } else if(upCount == downCount){
                    signalMessage(null);
                    setTimer(6000);
                    setTimeout(() => {
                        reset();
                    }, 6000);
                }
            }

        }

    };

    const signalMessage = (message) => {
        let signalDivMessage = message;
        
        if(message == "SELL"){
            signalDivMessage = `<span style="color:red;font-size: 24px;  font-weight: 900;">${message}</span><br/>waiting to close the trade...`;
        }else if(message == "BUY"){
            signalDivMessage = `<span style="color:green;font-size: 24px;  font-weight: 900;">${message}</span><br/>waiting to close the trade...`;
        }

        if(message == null || message == ""){
            signalDiv.innerHTML = message;
            signalDiv.classList.remove("show");
            signalDiv.classList.add("hide");
        } else {
            signalDiv.innerHTML = signalDivMessage;
            signalDiv.classList.remove("hide");
            signalDiv.classList.add("show");
        }

    };

    const makeTheTrade = (object) => {
        // console.log('object - ', object);
        
        buyRequest = {
            buy: object.proposal.id,
            price: object.proposal.ask_price,
        };
        ws.send(JSON.stringify(buyRequest));
    };

    const placeRiseFallTrade = (tradeType, newStake) => {
        allowEquals = false;
        const tradeRequest = {
            proposal: 1,
            contract_type: allowEquals 
                ? (tradeType === 'CALL' ? 'CALLE' : 'PUTE') // Adjust trade type for Allow Equals
                : tradeType, // 'CALL' or 'PUT' without Allow Equals
            amount: roundToTwoDecimals(newStake), // Stake amount
            basis: 'stake',
            // contract_type: tradeType, // 'CALL' for Rise or 'PUT' for Fall
            currency: 'USD',
            duration: 5, // 5 ticks
            duration_unit: 't',
            symbol: market, // Market: e.g., Volatility 100 Index
        };
    
        // Send the trade request to the WebSocket
        console.log('Sending Rise/Fall trade request:', tradeRequest);
        ws.send(JSON.stringify(tradeRequest));
    };

    // Function to fetch trade details by Contract ID
    const fetchTradeDetails = (contractId) => {
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            console.error("WebSocket is not open.");
            return;
        }
    
        const contractDetailsRequest = {
            proposal_open_contract: 1,
            contract_id: contractId,
        };
    
        // console.log("Fetching trade details for Contract ID:", contractId);
        console.log("Waiting for close contract...");
        ws.send(JSON.stringify(contractDetailsRequest));
    }

    const reportUpdate = (totalTradeCount, winCount, lossCount, totalProfit, totalLoss, currentLossAmount, currentProfitAmount, initialAccBalance) => {
        // const totalResults = document.getElementById('totalResults'); // For displaying WebSocket messages

        // document.getElementById('initialAccBalance').innerHTML = response.authorize.balance;
        document.getElementById('totalTradeCount').innerHTML = totalTradeCount;
        document.getElementById('winCount').innerHTML = winCount;
        document.getElementById('lossCount').innerHTML = lossCount;
        let newAccBalance = initialAccBalance + currentProfitAmount;


        if(totalProfit < 0){
            document.getElementById('totalProfit').innerHTML = `<span style="color: red; font-weight: 900;">$${totalProfit}</span>`;
        } else if(totalProfit == 0){
            document.getElementById('totalProfit').innerHTML = `<span>$${totalProfit}</span>`;
        } else {
            document.getElementById('totalProfit').innerHTML = `<span style="color: green; font-weight: 900;">$${totalProfit}</span>`;
        }


        if(newAccBalance < initialAccBalance){
            document.getElementById('newAccBalance').innerHTML = `<span style="color: red; font-weight: 900;">$${newAccBalance}</span>`;
        } else if(newAccBalance == initialAccBalance){
            document.getElementById('newAccBalance').innerHTML = `<span>$${newAccBalance}</span>`;
        } else {
            document.getElementById('newAccBalance').innerHTML = `<span style="color: green; font-weight: 900;">$${newAccBalance}</span>`;
        }


        if(totalLoss < 0){
            document.getElementById('totalLoss').innerHTML = `<span style="color: red; font-weight: 900;">$${totalLoss}</span>`;
        } else if(totalLoss == 0){
            document.getElementById('totalLoss').innerHTML = `<span>$${totalLoss}</span>`;
        } else {
            document.getElementById('totalLoss').innerHTML = `<span style="color: green; font-weight: 900;">$${totalLoss}</span>`;
        }

        if(currentLossAmount < 0){
            document.getElementById('currentLossAmount').innerHTML = `<span style="color: red; font-weight: 900;">$${currentLossAmount}</span>`;
        } else if(currentLossAmount == 0){
            document.getElementById('currentLossAmount').innerHTML = `<span>$${currentLossAmount}</span>`;
        } else {
            document.getElementById('currentLossAmount').innerHTML = `<span style="color: green; font-weight: 900;">$${currentLossAmount}</span>`;
        }

        if(currentProfitAmount < 0){
            document.getElementById('currentProfitAmount').innerHTML = `<span style="color: red; font-weight: 900;">$${currentProfitAmount}</span>`;
        } else if(currentProfitAmount == 0){
            document.getElementById('currentProfitAmount').innerHTML = `<span>$${currentProfitAmount}</span>`;
        } else {
            document.getElementById('currentProfitAmount').innerHTML = `<span style="color: green; font-weight: 900;">$${currentProfitAmount}</span>`;
        }


    };

};
