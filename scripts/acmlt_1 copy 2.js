// Initialize variables
const cutofPercentages = 20; // Cutoff percentage

// Main script runner
function runAccumulatorScript() {
    console.log("Running Accumulator script...");

    if (isRunning) {
        // Stop WebSocket
        isRunning = false;
        clearInterval(intervalId);
        if (ws) {
            ws.close();
            ws = null;
        }
        console.log('WebSocket connection stopped.');
    } else {
        // Start WebSocket
        isRunning = true;
        startWebSocket();
        console.log('WebSocket connection started.');
    }
}

// Start WebSocket
function startWebSocket() {
    ws = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089'); // Replace with your app_id

    ws.onopen = function () {
        console.log('WebSocket connection opened.');
        ws.send(JSON.stringify({ authorize: apiToken }));
    };

    ws.onmessage = function (event) {
        const response = JSON.parse(event.data);

        if (response.error) {
            console.error('Error:', response.error.message);
            ws.close();
            return;
        }

        if (response.msg_type === 'authorize') {
            console.log('Authorized successfully.');
            intervalId = setInterval(() => requestTicksHistory(market, historyDataCount), intervalTime);
        }

        if (response.msg_type === 'history') {
            const lastDigitList = response.history.prices;
            const percentages = calculateLastDigitPercentages(lastDigitList);

            console.log("Percentages of last digits (0-9):", percentages);

            // Trade logic based on percentages
            // if (percentages[1] < cutofPercentages) {
            //     placeTrade('DIGITOVER'); // Predict last digit > 1
            // }

            placeTrade('DIGITOVER'); // Predict last digit > 1

        }

        if (response.msg_type === 'proposal') {
            console.log('Proposal Response:', response.proposal);
        }

        if (response.msg_type === 'buy') {
            console.log('Trade Successful:', response.buy);
        }
    };

    ws.onclose = function () {
        console.log('WebSocket connection closed.');
    };

    ws.onerror = function (err) {
        console.error('WebSocket error:', err);
    };

    // Place a trade (called after signal analysis)
    const placeTrade = (tradeType) => {
        const tradeRequest = {
            proposal: 1,
            amount: 1, // $1 stake
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


runAccumulatorScript();