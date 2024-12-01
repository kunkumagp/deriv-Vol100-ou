
function runMatchesDifferScript() {
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

runMatchesDifferScript();


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

    let digitCounts = Array(10).fill(0); // Frequency counter for digits 0-9
    let totalTicks = 0;

    let lastDigitList = [];
    let percentages = null;
    let currentlastDigit = null;


    ws.onopen = function () {
        // Authenticate
        ws.send(JSON.stringify({
            authorize: apiToken
        }));
        output.innerHTML += 'WebSocket connection opened.\n-------------------------------------\n';
    };

    ws.onmessage = function (event) { 
        const response = JSON.parse(event.data);

        if (response.msg_type === 'authorize') {
            console.log('Authorization successful.');
            // requestTicksHistory(market);
            ticks();
            // makeTrades();
        }

         // Handle tick updates
         if (response.msg_type === 'tick') {
            const tick = response.tick;
            ticksHandle(tick);
            requestTicksHistory(market);
        }


        if (response.msg_type === 'history') {
            lastDigitList = response.history.prices;
            percentages = calculateLastDigitPercentages(lastDigitList);
            console.log("Percentages of last digits (0-9):", percentages);
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
            output.innerHTML += `Trade started:\nContract ID = ${lastTradeId}\nStake = ${response.buy.buy_price}\n`;
            totalTradeCount = totalTradeCount + 1
            setTimeout(() => {
                fetchTradeDetails(lastTradeId);
            }, 3000);
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
                    } else {
                        totalLossAmount = totalLossAmount + profit;
                        lossTradeCount = lossTradeCount+1;
                    }
                    lossAmount = lossAmount + profit
                    if(lossAmount > 0){lossAmount = 0;}

                    newProfit = totalProfitAmount + totalLossAmount;
                    const spanColor = newProfit > 0 ? 'green' : 'red';
                    totalResults.innerHTML = `Total Trade Count: ${totalTradeCount}\nWin Count: ${winTradeCount}\nLoss Count: ${lossTradeCount}\nProfit: $${totalProfitAmount}\nLoss: $${totalLossAmount}\n\n-----------------------------\nLoss Amount: $${lossAmount}\nNew Profit : <span style="color: ${spanColor}; font-weight: 900;">$${newProfit}</span>  \n`;
                    
                    if( profit > 0){
                        scriptRunInLoop(true);   
                    } else {
                        scriptRunInLoop(false); 
                    }
                    // requestTicksHistory(market);  
                    
                } else {
                    setTimeout(() => {
                        fetchTradeDetails(lastTradeId);
                    }, 3000);
                }
            }
            
        }

       
    }

    ws.onclose = function () {
        console.log('Connection closed');
        output.innerHTML += 'Connection closed\n-----------------------------\n\n';
        console.log('-----------------------------\n');
    };

    ws.onerror = function (err) {
        console.error('WebSocket error:', err);
        output.innerHTML += `WebSocket error: ${err.message}\n`;
    };


    const scriptRunInLoop = (isLastTradeWin) =>{

        if(totalTradeCount < tradeCountsPerRun){
            requestTicksHistory(market);
        } else {
            let text = totalResults.innerHTML.replaceAll(/\n\n-----------------------------/g,"");
            text += `\n-----------------------------\n`;
            results.innerHTML += text;
            webSocketConnectionStop();
            setTimeout(() => {
                webSocketConnectionStart();
            }, 2000);
        }
    };


    const requestTicksHistory = (symbol) => {
        const ticksHistoryRequest = {
            ticks_history: symbol,
            end: 'latest',
            count: 1000, // Increased count for a larger dataset (more ticks for better prediction)
            style: 'ticks'
        };
        ws.send(JSON.stringify(ticksHistoryRequest));
    };

    const ticksHandle = (tick) =>{
        currentlastDigit = parseInt(tick.quote.toString().slice(-1), 10); // Get the last digit
        digitCounts[currentlastDigit]++; // Increment the counter for this digit
        totalTicks++;

        // Calculate percentages
        const stats = digitCounts.map((count, digit) => ({
            digit,
            count,
            percentage: ((count / totalTicks) * 100).toFixed(2),
        }));

        // Display stats
        // output.innerHTML = `Total Ticks: ${totalTicks}\n` + stats
        //     .map(stat => `Digit ${stat.digit}: ${stat.count} (${stat.percentage}%)`)
        //     .join('\n');
    }

    const ticks = () => {
        // Subscribe to tick updates
        ws.send(JSON.stringify({
            ticks: market,
            subscribe: 1,
        }));
    };

    const makeTrades = () => {
        // lastDigitList = response.history.prices;
        // percentages = calculateLastDigitPercentages(lastDigitList);

        // Find the lowest value
        // const lowest = Math.min(...percentages);

        // // Find the highest value
        const highest = Math.max(...percentages);

        // // Find their indices
        // const lowestIndex = percentages.indexOf(lowest);
        const highestIndex = percentages.indexOf(highest);

        // console.log('lowest - ', lowest);
        // console.log('lowestIndex - ', lowestIndex);
        // console.log('highest - ', highest);
        // console.log('highestIndex - ', highestIndex);
        // console.log('currentlastDigit - ', currentlastDigit);
        // console.log('highestIndex - ', highestIndex);
        
        

        const tradeType = 'DIGITDIFF'; // Or 'MULTDOWN' for downward trades
        newStake = 10;
        if(currentlastDigit == highestIndex){
            placeTrade(tradeType, newStake, highestIndex);
        }
    };

    // Place a trade (called after signal analysis)
    const placeTrade = (tradeType, tradeStake, barrier) => {
        const tradeParameters = {
            amount: tradeStake, // Trade stake
            basis: 'stake', // Stake type
            contract_type: tradeType, // Contract type ('DIGITMATCH' or 'DIGITDIFF')
            currency: 'USD', // Account currency
            duration: 1, // Duration in ticks
            duration_unit: 't', // Duration unit: ticks
            symbol: 'R_100', // Market: Volatility 100 Index
            barrier: barrier, // Single-digit barrier (0-9)
        };

        ws.send(JSON.stringify({
            proposal: 1, // Request a trade proposal
            ...tradeParameters,
        }));

        console.log('Trade proposal request sent:', tradeParameters);
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
    
        console.log("Fetching trade details for Contract ID:", contractId);
        ws.send(JSON.stringify(contractDetailsRequest));
    }

}

function getLastDigit(N, maxDecimalCount) {
    const str = N.toFixed(maxDecimalCount); // Format the number to the specified decimal places
    const lastChar = str.charAt(str.length - 1); // Get the last character
    return parseInt(lastChar, 10); // Convert it back to an integer
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
