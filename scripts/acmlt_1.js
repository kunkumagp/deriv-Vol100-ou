
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
    const cutofPercentages = 10;
    let totalProfitAmount = 0;
    let totalLossAmount = 0;
    let totalTradeCount = 0;
    let winTradeCount = 0;
    let lossTradeCount = 0;
    let newProfit = 0 ;
    let lossAmount = 0;
    let lastDigit = 0;
    let maxDecimalCount = 0;

    ws.onopen = function () {
        // Authenticate
        getAuthentication();
        output.innerHTML += 'WebSocket connection opened.\n-------------------------------------\n';
    };

    

    ws.onmessage = function (event) { 
        const response = JSON.parse(event.data);

        if (response.msg_type === 'authorize') {
            console.log('Authorization successful.');
            subscribeToTicks(market); // Subscribe to live ticks
        }

        if (response.msg_type === 'tick') {
            const tickData = response.tick;
            // const lastDigit = parseInt(tickData.quote.toString().slice(-1), 10);
            lastDigit = getLastDigit(tickData.quote);
            requestTicksHistory(market);

            console.log("Received tick:", tickData);

            // You can now use this last digit data for your logic
        }

        if (response.msg_type === 'history') {
            // console.log(response.history.prices);

            const lastDigitList = response.history.prices;
            maxDecimalCount = getMaxDecimals(lastDigitList);

            const percentages = calculateLastDigitPercentages(lastDigitList);
            const lastDigit = getLastDigit(lastDigitList[lastDigitList.length - 1], maxDecimalCount) ;
            console.log("Percentages of last digits (0-9):", percentages);
            console.log("Last Digit : ", lastDigit);

            
            // chart(percentages, cutofPercentages);
            // console.log("Last Digit : ", lastDigit);

            // if( (percentages[0] < cutofPercentages) && (percentages[1] < cutofPercentages)){
            //     placeTrade('DIGITOVER', newStake);
            // } else if( (percentages[0] < cutofPercentages) && (percentages[1] > cutofPercentages)){
            //     if(lastDigit == percentages[0]){
            //         placeTrade('DIGITOVER', newStake);
            //     } else {
            //         setTimeout(() => {
            //             requestTicksHistory(market);
            //         }, 3000);
            //     }
            // } else if( (percentages[0] > cutofPercentages) && (percentages[1] < cutofPercentages)){
            //     if(lastDigit == percentages[1]){
            //         placeTrade('DIGITOVER', newStake);
            //     } else {
            //         setTimeout(() => {
            //             requestTicksHistory(market);
            //         }, 3000);
            //     }
            // } else if( (percentages[0] > cutofPercentages) && (percentages[1] > cutofPercentages)){
            //     if(lastDigit == percentages[0] || lastDigit == percentages[1]){
            //         placeTrade('DIGITOVER', newStake);
            //     } else {
            //         setTimeout(() => {
            //             requestTicksHistory(market);
            //         }, 3000);
            //     }
            // }

            console.log('0 value : ',percentages[0]);
            console.log('1 value : ',percentages[1]);
            


            if( (percentages[0] < cutofPercentages) && (percentages[1] < cutofPercentages)){
                placeTrade('DIGITOVER', newStake);
            } else {
                setTimeout(() => {
                    requestTicksHistory(market);
                }, 3000);
            }

            // placeTrade('DIGITOVER', newStake);
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
                        if(newStake != stake){
                            newStake = stake;
                        }      
                        totalProfitAmount = totalProfitAmount + profit;
                        winTradeCount = winTradeCount+1;    
                    } else {
                        totalLossAmount = totalLossAmount + profit;
                        lossTradeCount = lossTradeCount+1;
                        newStake = newStake * 5.5;

                    }
                    lossAmount = lossAmount + profit
                    if(lossAmount > 0){lossAmount = 0;}

                    newProfit = totalProfitAmount + totalLossAmount;
                    const spanColor = newProfit > 0 ? 'green' : 'red';
                    totalResults.innerHTML = `Total Trade Count: ${totalTradeCount}\nWin Count: ${winTradeCount}\nLoss Count: ${lossTradeCount}\nProfit: $${totalProfitAmount}\nLoss: $${totalLossAmount}\n\n-----------------------------\nLoss Amount: $${lossAmount}\nNew Profit : <span style="color: ${spanColor}; font-weight: 900;">$${newProfit}</span>  \n`;
                    
                    if( profit > 0){
                        // Repeat the process by calling requestTicksHistory again after updating results
                        scriptRunInLoop(true);      
                    } else {
                        setTimeout(() => {
                            // Repeat the process by calling requestTicksHistory again after updating results
                            scriptRunInLoop(false);      
                        }, 2000);
                    }

                    
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

    const subscribeToTicks = (symbol) => {
        const ticksSubscriptionRequest = {
            ticks: symbol,
            subscribe: 1 // Enable subscription for live updates
        };
        ws.send(JSON.stringify(ticksSubscriptionRequest));
    };

    const scriptRunInLoop = (isLastTradeWin) =>{

        if(tradeCountsPerRun != null){
            if(totalTradeCount < tradeCountsPerRun){
                requestTicksHistory(market); 
            } else if(totalTradeCount >= tradeCountsPerRun && isLastTradeWin == false){
                requestTicksHistory(market); 
            } else if(totalTradeCount >= tradeCountsPerRun && isLastTradeWin == true){
    
                    let text = totalResults.innerHTML.replaceAll(/\n\n-----------------------------/g,"");
                    text += `\n-----------------------------\n`;
                    results.innerHTML += text;
    
                    webSocketConnectionStop();
                    setTimeout(() => {
                        webSocketConnectionStart();
                    }, 2000);
            }
        } else {
            requestTicksHistory(market); 
        }

        

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

function chart(percentages, cutofPercentages){

    var xValues = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
    var yValues = percentages;

    var redColor = 'red';
    var greenColor = 'green';
    var blueColor = 'blue';

    var barColors = [];

    if((percentages[0] < cutofPercentages) && percentages[1] < cutofPercentages){
        barColors = ["green", "green", "blue", "blue", "blue", "blue", "blue", "blue", "blue", "blue"];
    } else if((percentages[0] < cutofPercentages) && percentages[1] >= cutofPercentages){
        barColors = ["green", "red", "blue", "blue", "blue", "blue", "blue", "blue", "blue", "blue"];
    } else if((percentages[0] >= cutofPercentages) && percentages[1] < cutofPercentages){
        barColors = ["red", "green", "blue", "blue", "blue", "blue", "blue", "blue", "blue", "blue"];
    } else if((percentages[0] >= cutofPercentages) && percentages[1] >= cutofPercentages){
        barColors = ["red", "red", "blue", "blue", "blue", "blue", "blue", "blue", "blue", "blue"];
    }

    // var barColors = ["red", "green","blue","orange","brown"];

    new Chart("myChart", {
    type: "bar",
    data: {
        labels: xValues,
        datasets: [{
        backgroundColor: barColors,
        data: yValues
        }]
    },
    options: {
        legend: {display: false},
        title: {
        display: true,
        text: "Last Digit Stats"
        }
    }
    });

}

function getMaxDecimals(numbers) {
    let maxDecimals = 0;

    numbers.forEach((number) => {
        if (Math.floor(number) !== number) { // Check if it has decimals
            const decimalPlaces = number.toString().split('.')[1]?.length || 0;
            if (decimalPlaces > maxDecimals) {
                maxDecimals = decimalPlaces;
            }
        }
    });

    return maxDecimals;
}
