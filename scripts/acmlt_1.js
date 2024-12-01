
function runAccumulatorScript() {
    if (isRunning) {
        // Stop the loop and close the WebSocket
        isRunning = false;
        clearInterval(intervalId); // Stop the interval loop
        if (ws) {
            ws.close();
            ws = null;
        }
        console.log('WebSocket connection stopped.');
        document.getElementById('output').textContent += 'WebSocket connection stopped.\n';
        button.innerHTML = "Start WebSocket";
    } else {
        // Start the loop and open the WebSocket
        isRunning = true;
        startWebSocket();
        console.log('WebSocket connection started.');
        document.getElementById('output').textContent += 'WebSocket connection started.\n';
        button.innerHTML = "Stop WebSocket";
    }
}
runAccumulatorScript();

function startWebSocket() {

    const apiToken = 'yubZ4jcrU2ffmgl'; // Replace with your actual API token
    const market = 'R_100'; // Volatility 10 Index 1s
    const output = document.getElementById('output'); // For displaying WebSocket messages
    ws = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089'); // Replace with your own app_id if needed
    let newStake = stake;

    let totalProfitAmount = 0;
    let totalLossAmount = 0;
    let totalTradeCount = 0;
    let winTradeCount = 0;
    let lossTradeCount = 0;
    let newProfit = 0 ;
    let lossAmount = 0;


    ws.onopen = function () {
        // Authenticate
        getAuthentication();
        output.innerHTML += 'WebSocket connection opened.\n';
    };

    ws.onmessage = function (event) { 
        const response = JSON.parse(event.data);

        if (response.msg_type === 'authorize') {
            console.log('Authorization successful.');
            requestTicksHistory(market);
        }

        if (response.msg_type === 'history') {
            // console.log(response.history.prices);

            const lastDigitList = response.history.prices;
            const percentages = calculateLastDigitPercentages(lastDigitList);
            console.log("Percentages of last digits (0-9):", percentages);
            

            placeTrade('DIGITOVER', newStake);
        }

        if (response.msg_type === 'proposal') {
            console.log('Proposal Response:', response.proposal);

            const buyRequest = {
                buy: response.proposal.id,
                price: response.proposal.ask_price,
            };
            ws.send(JSON.stringify(buyRequest));
        }


        console.log(response);
        

        if (response.msg_type === 'buy') {
            console.log('Trade Successful:', response);
            lastTradeId = response.buy.contract_id; // Save the trade's contract ID
            output.innerHTML += `Trade started: Contract ID = ${lastTradeId}\n`;
            totalTradeCount = totalTradeCount + 1
            setTimeout(() => {
                fetchTradeDetails(lastTradeId);
            }, 4000);
        }

        if (response.msg_type === 'proposal_open_contract' && response.proposal_open_contract.contract_id === lastTradeId) {
            const contract = response.proposal_open_contract;

            if (contract.is_sold) {
                const profit = contract.profit;
                const result = profit > 0 ? 'Win' : 'Loss';

                output.innerHTML += `Trade Result: <span style="color: ${profit > 0 ? 'green' : 'red'}; font-weight: 900;">${result}</span>, Profit: <span style="color: ${profit > 0 ? 'green' : 'red'}; font-weight: 900;">$${profit.toFixed(2)}</span>\n`;

                if( profit > 0){
                    if(newStake != stake){
                        newStake = stake;
                    }      
                    totalProfitAmount = totalProfitAmount + profit;
                    winTradeCount = winTradeCount+1;    
                } else {
                    totalLossAmount = totalLossAmount + profit;
                    lossTradeCount = lossTradeCount+1;

                    // if(totalLossAmount >= (100 * 0.15)){
                    //     console.log('close');
                        
                    //     runAccumulatorScript();
                    // } else {
                    //     newStake = newStake * 5;
                    // }
                    newStake = newStake * 5;

                }
                lossAmount = lossAmount + profit
                if(lossAmount > 0){lossAmount = 0;}

                newProfit = totalProfitAmount + totalLossAmount;

                // if(lossAmount < 0){
                //     if(Math.abs(lossAmount) > stake){
                //         newStake = Math.abs(lossAmount) * 2;
                //     } else {
                //         newStake = stake * 2;
                //     }
                // } else {
                //     if(newStake != stake){
                //         newStake = stake;
                //     }
                // }

                const spanColor = newProfit > 0 ? 'green' : 'red';
                totalResults.innerHTML = `Total Trade Count: ${totalTradeCount}\n\Win Count: ${winTradeCount}\nLoss Count: ${lossTradeCount}\nProfit: $${totalProfitAmount}\nLoss: $${totalLossAmount}\n\n-----------------------------\nLoss Amount: $${lossAmount}\nNew Profit : <span style="color: ${spanColor}; font-weight: 900;">$${newProfit}</span>  \n`;
                
                if( profit > 0){
                    // Repeat the process by calling requestTicksHistory again after updating results
                    requestTicksHistory(market);        
                } else {
                    setTimeout(() => {
                        // Repeat the process by calling requestTicksHistory again after updating results
                        requestTicksHistory(market);
                    }, 2000);
                }

                
            }


        }
    
    };

    ws.onclose = function () {
        console.log('Connection closed');
        output.innerHTML += 'Connection closed\n';
    };

    ws.onerror = function (err) {
        console.error('WebSocket error:', err);
        output.innerHTML += `WebSocket error: ${err.message}\n`;
    };


    const getAuthentication = () => {
        ws.send(JSON.stringify({
            authorize: apiToken
        }));
    }
    
    const requestTicksHistory = (symbol) => {
        const ticksHistoryRequest = {
            ticks_history: symbol,
            end: 'latest',
            count: historyDataCount, // Increased count for a larger dataset (more ticks for better prediction)
            style: 'ticks'
        };
        ws.send(JSON.stringify(ticksHistoryRequest));
    };

    // Place a trade (called after signal analysis)
    const placeTrade = (tradeType, tradeStake) => {
        const tradeRequest = {
            proposal: 1,
            amount: tradeStake, // $1 stake
            basis: 'stake',
            contract_type: tradeType, // 'DIGITOVER' or 'DIGITUNDER'
            currency: 'USD',
            duration: 1, // 1 tick
            duration_unit: 't',
            symbol: market, // Market: Volatility 100 Index
            barrier: '1', // Predict last digit is 1
        };

        console.log('Sending trade request:', tradeRequest);
        ws.send(JSON.stringify(tradeRequest));
    };

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

// Function to fetch trade details by Contract ID
function fetchTradeDetails(contractId) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.error("WebSocket is not open.");
        return;
    }

    const contractDetailsRequest = {
        proposal_open_contract: 1,
        contract_id: contractId,
    };

    console.log("Fetching trade details for Contract ID:", contractId);
    ws.send(JSON.stringify(contractDetailsRequest));
}
