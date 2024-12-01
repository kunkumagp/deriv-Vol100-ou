let isRunning = false; // Flag to track the script state
let ws; // Declare WebSocket outside to manage it globally
let intervalId; // To store the interval ID
const intervalTime = 10000; // Interval for requesting ticks history
const stake = 1; // Trade stake amount
const historyDataCount = 11;

const button = document.getElementById('startWebSocket');
// button.addEventListener('click', toggleWebSocket);


function runRiseAndFallScript() {
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
runRiseAndFallScript();


function startWebSocket() {
    const apiToken = 'yubZ4jcrU2ffmgl'; // Replace with your actual API token
    ws = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089'); // Replace with your own app_id if needed
    const market = 'R_100'; // Volatility 10 Index 1s
    const output = document.getElementById('output'); // For displaying WebSocket messages

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
            output.innerHTML += 'Waiting for signal ...' + '\n';
            intervalId = setInterval(() => requestTicksHistory(market), intervalTime);
        }

        if (response.msg_type === 'history') {
            // Predict the next value based on the price history
            const predictionResult = predictNextValue(response.history.prices);
            // console.log('array: ', JSON.stringify(response.history.prices));
            console.log('Last Price: ', JSON.stringify(response.history.prices[20]));
            console.log(`Predicted value after 5 steps: ${predictionResult.predictedValue}, Predicted direction: ${predictionResult.prediction}`);

            // Calculate prediction accuracy
            const actualPrice = response.history.prices[10];
            const predictionAccuracy = calculateAccuracy([predictionResult.predictedValue], [actualPrice]);
            console.log(`Prediction accuracy: ${predictionAccuracy.toFixed(2)}%`);

            const signalResponse = tickAnalyze(response.history.prices);
            const displayText = `<div>Up Count: <b>${signalResponse.upCount}</b>, Down Count: <b>${signalResponse.downCount}</b>, Signal: <span style="color: ${signalResponse.signalColor}; font-weight: 900;">${signalResponse.signalText}</span></div>`;
            output.innerHTML += displayText + '\n';

            console.log(`Signel: ${signalResponse.signal}`);

            // Place a trade based on the signal
            if(predictionAccuracy > 99.9){
                if (signalResponse.signal === 'BUY') {
                    placeTrade('CALL');
                } else if (signalResponse.signal === 'SELL') {
                    placeTrade('PUT');
                }
            }
        }

        if (response.msg_type === 'proposal') {
            // console.log('Trade Proposal Received:', response.proposal);
            const buyRequest = {
                buy: response.proposal.id,
                price: response.proposal.ask_price,
            };
            // console.log('Sending buy request:', buyRequest);
            ws.send(JSON.stringify(buyRequest));
        }

        if (response.msg_type === 'buy') {
            // console.log('Trade Successful:', response);
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

    // Analyze the tick history to generate trade signals
    // const tickAnalyze = (numbers) => {
    //     let upCount = 0, downCount = 0;
    
    //     // Loop through the numbers array to calculate upCount and downCount
    //     for (let i = 0; i < numbers.length - 1; i++) {
    //         if (numbers[i + 1] > numbers[i]) {
    //             upCount++;
    //         } else if (numbers[i + 1] < numbers[i]) {
    //             downCount++;
    //         }
    //     }
    
    //     // Calculate 2/3 threshold
    //     const totalCount = numbers.length - 1; // Total number of comparisons
    //     const twoThirds = totalCount * (2 / 3);
    
    //     let signal = null, signalText = 'No Signal', signalColor = 'blue';
    
    //     // Determine the signal based on the 2/3 condition
    //     if (upCount >= twoThirds) {
    //         signal = 'BUY';
    //         signalText = 'STRONG BUY';
    //         signalColor = 'green';
    //     } else if (downCount >= twoThirds) {
    //         signal = 'SELL';
    //         signalText = 'STRONG SELL';
    //         signalColor = 'red';
    //     }
    
    //     return { upCount, downCount, signal, signalText, signalColor };
    // };



    const tickAnalyze = (numbers) => {
        let upCount = 0, downCount = 0;
    
        // Loop through the numbers array to calculate upCount and downCount
        for (let i = 0; i < numbers.length - 1; i++) {
            if (numbers[i + 1] > numbers[i]) {
                upCount++;
            } else if (numbers[i + 1] < numbers[i]) {
                downCount++;
            }
        }
    
        let signal = null, signalText = 'No Signal', signalColor = 'blue';
    
        // Determine the signal based on the 2/3 condition
        if (upCount > downCount) {
            signal = 'BUY';
            signalText = 'STRONG BUY';
            signalColor = 'green';
        } else if (downCount > upCount) {
            signal = 'SELL';
            signalText = 'STRONG SELL';
            signalColor = 'red';
        }
    
        return { upCount, downCount, signal, signalText, signalColor };
    };
    

    // Place a trade (called after signal analysis)
    const placeTrade = (tradeType) => {
        const tradeRequest = {
            proposal: 1,
            amount: stake, // $1 stake
            basis: 'stake',
            contract_type: tradeType, // 'CALL' for rise, 'PUT' for fall
            currency: 'USD',
            duration: 5, // 5 ticks
            duration_unit: 't',
            symbol: market,
        };
        // console.log('Sending trade request:', tradeRequest);
        ws.send(JSON.stringify(tradeRequest));
    };

    // Calculate differences between consecutive values
    function calculateDifferences(arr) {
        const differences = [];
        for (let i = 1; i < arr.length; i++) {
            differences.push(arr[i] - arr[i - 1]);
        }
        return differences;
    }

    // Calculate the average of the differences
    function calculateAverage(differences) {
        const sum = differences.reduce((acc, val) => acc + val, 0);
        return sum / differences.length;
    }

    // Smooth the data using a simple moving average (SMA)
    function movingAverage(arr, windowSize) {
        let result = [];
        for (let i = 0; i < arr.length - windowSize + 1; i++) {
            let window = arr.slice(i, i + windowSize);
            let avg = window.reduce((acc, value) => acc + value, 0) / window.length;
            result.push(avg);
        }
        return result;
    }

    // Predict the next value after 5 steps
    function predictNextValue(arr) {
        // Calculate differences between consecutive values
        const differences = calculateDifferences(arr);
        
        // Calculate the average difference
        const averageDiff = calculateAverage(differences);
    
        // Get the last value from the array
        const lastValue = arr[arr.length - 1];
    
        // Predict the next value after 5 steps
        const predictedValue = lastValue + (5 * averageDiff);
    
        // Determine if the predicted value is higher or lower
        const prediction = predictedValue > lastValue ? 'higher' : 'lower';
    
        return { predictedValue: predictedValue.toFixed(2), prediction };
    }
    

    // Function to calculate prediction accuracy
    function calculateAccuracy(predictedValues, actualValues) {
        let totalError = 0;
        let totalPredictions = predictedValues.length;

        for (let i = 0; i < totalPredictions; i++) {
            const predicted = predictedValues[i];
            const actual = actualValues[i];
            const percentageError = (Math.abs(predicted - actual) / actual) * 100;
            totalError += percentageError;
        }

        const averageError = totalError / totalPredictions;
        const accuracy = 100 - averageError;
        return accuracy;
    }
}
