
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
    button.innerHTML = "Stop WebSocket";
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
    button.innerHTML = "Start WebSocket";
};

percentage.addEventListener('change', ()=>{
    percentageValue = percentage.value;
});

marketOption.addEventListener('change', ()=>{
    selectedMarket = marketOption.value;
});


runAccumulatorScript();

function startWebSocket() {
    const apiToken = 'yubZ4jcrU2ffmgl'; // Replace with your actual API token
    const output = document.getElementById('output'); // For displaying WebSocket messages
    ws = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089'); // Replace with your own app_id if needed
    let newStake = stake;
    let lastTradeId;

    // let totalProfitAmount = 0;
    // let totalLossAmount = 0;
    // let totalTradeCount = 0;
    // let winTradeCount = 0;
    // let lossTradeCount = 0;
    // let newProfit = 0 ;
    // let lossAmount = 0;
    // let winCountPerRow = 0;
    let initialAccBalance = 0;
    let updatedAccBalance = 0;
    const tradeType = 'ACCU'; // Or 'MULTDOWN' for downward trades


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

        // console.log('response - ', response);



        if (response.msg_type === 'authorize') {
            console.log('Authorization successful.');
            
            initialAccBalance = response.authorize.balance;
            document.getElementById('initialAccBalance').innerHTML = initialAccBalance;
            
            makeTrades();
        }


        if (response.msg_type === 'proposal') {
            console.log('Proposal Response:', response.proposal);

            const buyRequest = {
                buy: response.proposal.id,
                price: response.proposal.ask_price,
            };
            ws.send(JSON.stringify(buyRequest));
        }


        if (response.msg_type === 'buy' && !response.error) {
            console.log('Trade Successful:', response);

            updatedAccBalance = response.buy.balance_after;
            lastTradeId = response.buy.contract_id; // Save the trade's contract ID
            
            // output.innerHTML += `Trade started:\nContract ID = ${lastTradeId}, Stake = ${response.buy.buy_price}, Market = ${selectedMarket}\n`;
            // totalTradeCount = totalTradeCount + 1
            // setTimeout(() => {
            //     fetchTradeDetails(lastTradeId);
            // }, 3000);

            fetchTradeDetails(lastTradeId);
        }


        if(response.msg_type === 'proposal_open_contract'){
            if(response.proposal_open_contract.contract_id === lastTradeId){
                const contract = response.proposal_open_contract;

                const profit = parseFloat(response.proposal_open_contract.profit);
                console.log(`Current profit: ${profit}`);

                if (profit >= (newStake * profitLimit)) {
                    console.log(`Take Profit reached: ${profit}`);
                    closeContract(contract.contract_id);
                }

                if (contract.is_sold) {
                    const profit = contract.profit;
                    const result = profit > 0 ? 'Win' : 'Loss';

                    console.log(result);
                    console.log(profit);


                } else {
                    setTimeout(() => {
                        fetchTradeDetails(lastTradeId);
                    }, 1500);
                }
            }
        }

        
    };

    const makeTrades = () => {
        newStake = 10;
        placeTrade(tradeType, newStake);
    };

    const getAuthentication = () => {
        ws.send(JSON.stringify({
            authorize: apiToken
        }));
    }

    const placeTrade = (tradeType, tradeStake) => {
        // selectedMarket = getRandomMarket(marketArray, selectedMarket);
        const tradeRequest = {
            buy: 1,
            price: tradeStake, // Stake amount
            parameters: {
                amount: tradeStake, // Stake amount
                basis: 'stake', // Define stake basis
                contract_type: tradeType, // Accumulator contract type
                currency: 'USD', // Currency for trading
                duration_unit: 't', // Tick duration
                symbol: selectedMarket, // Underlying market
                growth_rate: percentageValue, // Choose one from growth_rate_range
            },
        }
        ;
    
        console.log('Sending trade request for Accumulator:', tradeRequest);
        ws.send(JSON.stringify(tradeRequest));
    };

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
        ws.send(JSON.stringify(contractDetailsRequest));
    }

    const closeContract = (contractId) => {
        const sellRequest = {
            sell: contractId,
            price: 0, // Accept any price (market sell)
        };
    
        console.log('Closing contract:', sellRequest);
        ws.send(JSON.stringify(sellRequest));
    };

    
}