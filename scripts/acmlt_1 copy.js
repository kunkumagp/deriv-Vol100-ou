
// // const button = document.getElementById('startWebSocket');

// function runAccumulatorScript() {
//     console.log("Running Accumulator script...");
//     // Your WebSocket or trading logic for Accumulator

//     if (isRunning) {
//         // Stop the loop and close the WebSocket
//         isRunning = false;
//         clearInterval(intervalId); // Stop the interval loop
//         if (ws) {
//             ws.close();
//             ws = null;
//         }
//         console.log('WebSocket connection stopped.');
//         document.getElementById('output').textContent += 'WebSocket connection stopped.\n';
//         button.innerHTML = "Start WebSocket";
//     } else {
//         // Start the loop and open the WebSocket
//         isRunning = true;
//         startWebSocket();
//         console.log('WebSocket connection started.');
//         document.getElementById('output').textContent += 'WebSocket connection started.\n';
//         button.innerHTML = "Stop WebSocket";
//     }
// }

// function startWebSocket() {
//     ws = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089'); // Replace with your own app_id if needed
//     const historyDataCount = 25;
//     const cutofPercentages = 20;
//     ws.onopen = function () {
//         // Authenticate
//         ws.send(JSON.stringify({
//             authorize: apiToken
//         }));
//         output.innerHTML += 'WebSocket connection opened.\n';
//     };

//     ws.onmessage = function (event) {
//         const response = JSON.parse(event.data);

//         if (response.error) {
//             console.error(response.error.message);
//             output.innerHTML += `Error: ${response.error.message}\n`;
//             ws.close();
//             return;
//         }

//         if (response.msg_type === 'authorize') {
//             // Start the interval loop to request ticks history periodically
//             output.innerHTML += 'Waiting for signal ...' + '\n';
//             intervalId = setInterval(() => requestTicksHistory(market, historyDataCount), intervalTime);
//         }



//         if (response.msg_type === 'history') {
//             const lastDigitList = response.history.prices;

//             // Calculate percentages
//             const percentages = calculateLastDigitPercentages(lastDigitList);

//             // Display results
//             console.log("Percentages of last digits (0-9):", percentages);

//             // if((percentages[0] < cutofPercentages) || (percentages[1] < cutofPercentages) || (percentages[0] < cutofPercentages && percentages[1] < cutofPercentages)){
//             //     lookingForTrade(percentages, lastDigitList[lastDigitList.length-1], cutofPercentages);
//             // }

//             placeTrade('DIGITOVER');
//             console.log('after response - ',response);


//         }

//         // if(percentages[0] < 10){
//         //     lookingForTrade(percentages, lastDigitList[lastDigitList.length-1])
//         // }

//         // if(percentages[1] < 10){
//         //     lookingForTrade(percentages, lastDigitList[lastDigitList.length-1])
//         // }

//     };

//     ws.onclose = function () {
//         console.log('Connection closed');
//         output.innerHTML += 'Connection closed\n';
//     };

//     ws.onerror = function (err) {
//         console.error('WebSocket error:', err);
//         output.innerHTML += `WebSocket error: ${err.message}\n`;
//     };

//     const placeTrade = (tradeType) => {
//         const tradeRequest = {
//             proposal: 1,
//             amount: 1, // $1 stake
//             basis: 'stake',
//             contract_type: tradeType, // 'DIGITOVER' or 'DIGITUNDER'
//             currency: 'USD',
//             duration: 1, // 1 tick
//             duration_unit: 't',
//             symbol: market, // Volatility 100 Index
//             barrier: '1', // Last digit prediction
//         };
    
//         console.log('Sending trade request:', tradeRequest);
//         ws.send(JSON.stringify(tradeRequest));
//     };
    

// }


// function lookingForTrade(percentages, lastPrice, cutofPercentages) {

//     let lastDigit = lastPrice.toString().split('.')[1].slice(-1);
//     console.log('Last Digit : ', lastDigit);

//     if((lastDigit == 0) && (percentages[0] < cutofPercentages)){
//         console.log('Place OVER trade');
//     }

//     if((lastDigit == 1) && (percentages[1] < cutofPercentages)){
//         console.log('Place OVER trade');
//     }
// }





// function calculateLastDigitPercentages(numbers) {
//     const totalNumbers = numbers.length;
//     const digitCounts = Array(10).fill(0);

//     // Determine the maximum decimal places in the array
//     const maxDecimals = Math.max(
//         ...numbers.map(num => (num.toString().split('.')[1] || '').length)
//     );

//     // console.log("Max decimals:", maxDecimals);

//     // Normalize all numbers to the maximum decimal places
//     const normalizedNumbers = numbers.map(num =>
//         Number(num.toFixed(maxDecimals))
//     );

//     // console.log("Normalized Numbers:", normalizedNumbers);

//     // Count the occurrences of each last digit
//     normalizedNumbers.forEach(num => {
//         const lastChar = num.toString().slice(-1); // Get the actual last digit as a string
//         const lastDigit = parseInt(lastChar, 10); // Convert to a number
//         digitCounts[lastDigit]++;
//     });

//     // Calculate percentages
//     const percentages = digitCounts.map(count => (count / totalNumbers) * 100);

//     return percentages;
// }


// runAccumulatorScript();