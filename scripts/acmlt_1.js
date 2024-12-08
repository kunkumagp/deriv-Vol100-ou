
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

runAccumulatorScript();

function startWebSocket() {

    const apiToken = 'yubZ4jcrU2ffmgl'; // Replace with your actual API token
    const market = 'R_100'; // Volatility 10 Index 1s
    const output = document.getElementById('output'); // For displaying WebSocket messages
    ws = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089'); // Replace with your own app_id if needed
    let newStake = stake;
    const marketArray = ['R_10', 'R_25', 'R_50', 'R_75', 'R_100'];
    let selectedMarket = market;

    let totalProfitAmount = 0;
    let totalLossAmount = 0;
    let totalTradeCount = 0;
    let winTradeCount = 0;
    let lossTradeCount = 0;
    let newProfit = 0 ;
    let lossAmount = 0;
    let winCountPerRow = 0;

    ws.onopen = function () {
        // Authenticate
        getAuthentication();
        output.innerHTML += 'WebSocket connection opened.\n-------------------------------------\n';
    };

    ws.onmessage = function (event) { 
        const response = JSON.parse(event.data);

        if (response.msg_type === 'authorize') {
            console.log('Authorization successful.');
            document.getElementById('initialAccBalance').innerHTML = response.authorize.balance;
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


        if (response.msg_type === 'buy') {
            console.log('Trade Successful:', response);
            lastTradeId = response.buy.contract_id; // Save the trade's contract ID
            output.innerHTML += `Trade started:\nContract ID = ${lastTradeId}, Stake = ${response.buy.buy_price}, Market = ${selectedMarket}\n`;
            totalTradeCount = totalTradeCount + 1
            setTimeout(() => {
                fetchTradeDetails(lastTradeId);
            }, 3000);
        }

        // console.log(response);
        

        if(response.msg_type === 'proposal_open_contract'){
            if(response.proposal_open_contract.contract_id === lastTradeId){
                const contract = response.proposal_open_contract;

                const profit = parseFloat(response.proposal_open_contract.profit);
                console.log(`Current profit: ${profit}`);


                if (profit >= 1) {
                    console.log(`Take Profit reached: ${profit}`);
                    closeContract(contract.contract_id);
                }


                if (contract.is_sold) {
                    const profit = contract.profit;
                    const result = profit > 0 ? 'Win' : 'Loss';

                    output.innerHTML += `Trade Result: <span style="color: ${profit > 0 ? 'green' : 'red'}; font-weight: 900;">${result}</span>, Profit: <span style="color: ${profit > 0 ? 'green' : 'red'}; font-weight: 900;">$${profit.toFixed(2)}</span>\n-------------------------------------\n`;

                    if( profit > 0){
                        totalProfitAmount = totalProfitAmount + profit;
                        winTradeCount = winTradeCount+1;
                        winCountPerRow = winCountPerRow+1;
                    } else {
                        totalLossAmount = totalLossAmount + profit;
                        lossTradeCount = lossTradeCount+1;
                        winCountPerRow = 0;
                    }
                    lossAmount = lossAmount + profit
                    if(lossAmount > 0){lossAmount = 0;}

                    newProfit = totalProfitAmount + totalLossAmount;
                    const spanColor = newProfit > 0 ? 'green' : 'red';
                    // totalResults.innerHTML = `Total Trade Count: ${totalTradeCount}\nWin Count: ${winTradeCount}\nLoss Count: ${lossTradeCount}\nProfit: $${totalProfitAmount}\nLoss: $${totalLossAmount}\n\n-----------------------------\nLoss Amount: $${lossAmount}\nNew Profit : <span style="color: ${spanColor}; font-weight: 900;">$${newProfit}</span>  \n`;
                    reportUpdate(totalTradeCount, winTradeCount, lossTradeCount, totalProfitAmount, totalLossAmount, lossAmount, newProfit);
                    // console.log('winCountPerRow - ',winCountPerRow);

                    if(profit < 0){
                        setTimeout(() => {
                            selectedMarket = getRandomMarket(marketArray, selectedMarket);
                            scriptRunInLoop(true);

                        }, 10000);
                        
                    } else {
                        scriptRunInLoop(true);
                    }
                    output.scrollTop = output.scrollHeight;
                    
                } else {
                    setTimeout(() => {
                        fetchTradeDetails(lastTradeId);
                    }, 3000);
                }
            }
            
        }
    
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

    const closeContract = (contractId) => {
        const sellRequest = {
            sell: contractId,
            price: 0, // Accept any price (market sell)
        };
    
        console.log('Closing contract:', sellRequest);
        ws.send(JSON.stringify(sellRequest));
    };

    const reportUpdate = (totalTradeCount, winCount, lossCount, totalProfit, totalLoss, currentLossAmount, currentProfitAmount) => {
        // const totalResults = document.getElementById('totalResults'); // For displaying WebSocket messages

        // document.getElementById('initialAccBalance').innerHTML = response.authorize.balance;
        document.getElementById('totalTradeCount').innerHTML = totalTradeCount;
        document.getElementById('winCount').innerHTML = winCount;
        document.getElementById('lossCount').innerHTML = lossCount;


        if(totalProfit < 0){
            document.getElementById('totalProfit').innerHTML = `<span style="color: red; font-weight: 900;">$${totalProfit}</span>`;
        } else if(totalProfit == 0){
            document.getElementById('totalProfit').innerHTML = `<span>$${totalProfit}</span>`;
        } else {
            document.getElementById('totalProfit').innerHTML = `<span style="color: green; font-weight: 900;">$${totalProfit}</span>`;
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

    const scriptRunInLoop = (isLastTradeWin) =>{

        makeTrades(); 

        // if(totalTradeCount < tradeCountsPerRun){
        //     makeTrades(); 
        // } else if(totalTradeCount >= tradeCountsPerRun && isLastTradeWin == false){
        //     makeTrades();
        // } else if(totalTradeCount >= tradeCountsPerRun && isLastTradeWin == true){
        //     let text = totalResults.innerHTML.replaceAll(/\n\n-----------------------------/g,"");
        //     text += `\n-----------------------------\n`;
        //     results.innerHTML += text;

        //     webSocketConnectionStop();
        //     setTimeout(() => {
        //         webSocketConnectionStart();
        //     }, 2000);
        // }

    };

    const makeTrades = () => {
        const tradeType = 'ACCU'; // Or 'MULTDOWN' for downward trades
        const leverage = 50; // Example leverage
        placeTrade(tradeType, newStake, leverage);
    };


    const getAuthentication = () => {
        ws.send(JSON.stringify({
            authorize: apiToken
        }));
    }

    const getRandomMarket = (array, current) => {
        let randomIndex;
        let randomMarket;
    
        do {
            randomIndex = Math.floor(Math.random() * array.length);
            randomMarket = array[randomIndex];
        } while (randomMarket === current);
    
        return randomMarket;
    };
    
    // Place a trade (called after signal analysis)
    const placeTrade = (tradeType, tradeStake, leverage) => {
        const tradeRequest = {
            buy: 1,
            price: 10, // Stake amount
            parameters: {
                amount: 10, // Stake amount
                basis: 'stake', // Define stake basis
                contract_type: 'ACCU', // Accumulator contract type
                currency: 'USD', // Currency for trading
                duration_unit: 't', // Tick duration
                symbol: selectedMarket, // Underlying market
                growth_rate: 0.01, // Choose one from growth_rate_range
            },
        }
        ;
    
        console.log('Sending trade request for Accumulator:', tradeRequest);
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
        ws.send(JSON.stringify(contractDetailsRequest));
    }

}



// Calculate last digit percentages
function calculateLastDigitPercentages(numbers) {
    const totalNumbers = numbers.length;
    const digitCounts = Array(10).fill(0);

    const maxDecimals = Math.max(...numbers.map(num => (num.toString().split('.')[1] || '').length));
    const normalizedNumbers = numbers.map(num => Number(num.toFixed(maxDecimals)));

    normalizedNumbers.forEach(num => {
        const lastChar = num.toString().slice(-1); // Get the last digit
        const lastDigit = parseInt(lastChar, 10);
        digitCounts[lastDigit]++;
    });

    const percentages = digitCounts.map(count => (count / totalNumbers) * 100);
    return percentages;
}
