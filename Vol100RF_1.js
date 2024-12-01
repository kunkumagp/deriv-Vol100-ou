document.getElementById('startWebSocket').addEventListener('click', startWebSocket);

function startWebSocket() {
    const WebSocket = require('ws');

    const apiToken = 'yubZ4jcrU2ffmgl';  // Replace with your actual API token
    const ws = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089');  // You can use your own app_id
    const market = 'R_100';  // Volatility 10 Index 1s
    const output = document.getElementById('output'); // For displaying WebSocket messages

    ws.on('open', function open() {
        // Authenticate
        ws.send(JSON.stringify({
            authorize: apiToken
        }));
    });

    ws.on('message', function incoming(data) {
        const response = JSON.parse(data);

        if (response.error) {
            console.error(response.error.message);
            output.textContent += `Error: ${response.error.message}\n`;
            ws.close();
            return;
        }

        if (response.msg_type === 'authorize') {
            // Request last 1000 ticks history
            requestTicksHistory(market);
        }

        if (response.msg_type === 'history') {
            console.log(response);
            output.textContent += JSON.stringify(response, null, 2) + '\n';
        }
    });

    ws.on('close', function close() {
        console.log('Connection closed');
        output.textContent += 'Connection closed\n';
    });

    ws.on('error', function error(err) {
        console.error('WebSocket error:', err);
        output.textContent += `WebSocket error: ${err.message}\n`;
    });

    const requestTicksHistory = (symbol) => {
        const ticksHistoryRequest = {
            ticks_history: symbol,
            end: 'latest',
            count: 11, // Adjust the count as needed
            style: 'ticks'
        };
        console.log(ticksHistoryRequest);
        ws.send(JSON.stringify(ticksHistoryRequest));
    };
}
