
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
    ws = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089'); // Replace with your own app_id if needed
    const market = 'R_100'; // Volatility 10 Index 1s
    const output = document.getElementById('output'); // For displaying WebSocket messages

    let lastTradeId = null;
    let newStake = stake;

    let totalProfitAmount = 0;
    let totalLossAmount = 0;
    let totalTradeCount = 0;
    let winTradeCount = 0;
    let lossTradeCount = 0;
    let newProfit = 0 ;


    let initialBet = stake; // Initial bet amount
    let payoutRate = 0.23; // Profit rate (23%)
    let totalLoss = 0; // Total loss accumulated
    let currentBet = initialBet; // Start with the initial bet


    ws.onopen = function () {
        // Authenticate
        ws.send(JSON.stringify({
            authorize: apiToken
        }));
        output.innerHTML += 'WebSocket connection opened.\n';
    };

    ws.onmessage = function (event) {
        const response = JSON.parse(event.data);

        if (response.error) {
            console.error(response.error.message);
            output.innerHTML += `Error: ${response.error.message}\n`;
            ws.close();
            return;
        }

        if (response.msg_type === 'authorize') {
            // Start the interval loop to request ticks history periodically
            intervalId = setInterval(() => requestTicksHistory(market), intervalTime);
        }

        if (response.msg_type === 'history') {

            const lastDigitList = response.history.prices;
            const percentages = calculateLastDigitPercentages(lastDigitList);
            console.log("Percentages of last digits (0-9):", percentages);

            if(lastTradeId != null){
                // Fetch trade details using the Contract ID
                fetchTradeDetails(lastTradeId);
            } 
            console.log('currentBet - ',currentBet);

            // setTimeout(placeTrade('DIGITOVER', newStake), 2000);
            placeTrade('DIGITOVER', currentBet);
           
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
            output.innerHTML += `Trade started: Contract ID = ${lastTradeId}\n`;
            totalTradeCount = totalTradeCount + 1
            console.log('-------------------------');

        }

        // console.log('msg_type - ',response.msg_type);
        // console.log('response - ',response);
        
        if (response.msg_type === 'proposal_open_contract' && response.proposal_open_contract.contract_id === lastTradeId) {
            // Monitor the contract until it's settled
            const contract = response.proposal_open_contract;

            if (contract.is_sold) {
                const profit = contract.profit;
                const result = profit > 0 ? 'Win' : 'Loss';
                console.log(`Trade Result: ${result}, Profit: $${profit.toFixed(2)}`);
                output.innerHTML += `Trade Result: ${result}, Profit: $${profit.toFixed(2)}\n`;

                if(result == 'Loss'){
                    // calculateNextBet(false);
                    // tradeLossAmount = tradeLossAmount + profit.toFixed(2);
                    newStake = newStake * 5;
                    totalLossAmount = totalLossAmount + profit;
                    lossTradeCount = lossTradeCount+1;

                } else {
                    // calculateNextBet(true);
                    if(newStake != stake){
                        newStake = stake;
                    }
                    totalProfitAmount = totalProfitAmount + profit;
                    winTradeCount = winTradeCount+1;
                }

                newProfit = totalProfitAmount + totalLossAmount;
                const spanColor = newProfit > 0 ? 'green' : 'red';

                totalResults.innerHTML = `Total Trade Count: ${totalTradeCount}\n\Win Count: ${winTradeCount}\nLoss Count: ${lossTradeCount}\nProfit: $${totalProfitAmount}\nLoss: $${totalLossAmount}\nNew Profit : <span style="color: ${spanColor}; font-weight: 900;">$${newProfit}</span>  \n`;


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

    function calculateNextBet(win) {
        if (win) {
            // If win, reset everything
            totalLoss = 0;
            currentBet = initialBet;
        } else {
            // If loss, add current bet to total loss
            totalLoss += currentBet;
    
            // Calculate next bet to cover total loss and earn desired profit
            let desiredProfit = initialBet * payoutRate;
            currentBet = (totalLoss + desiredProfit) / payoutRate;
        }
    
        return currentBet.toFixed(2); // Return bet amount rounded to 2 decimals
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

