
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

marketOption.addEventListener('change', ()=>{
    selectedMarket = marketOption.value;
});

ldpOpion.addEventListener('change', ()=>{
    ldp = ldpOpion.value;
});

stakeOpion.addEventListener('change', ()=>{
    stake = stakeOpion.value;
});


runAccumulatorScript();


function startWebSocket() {
    // const apiToken = 'lkUxtOopvUhCpIX'; // Replace with your actual API token
    const apiToken = 'yubZ4jcrU2ffmgl'; // Replace with your actual API token

    const output = document.getElementById('output'); // For displaying WebSocket messages
    ws = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089'); // Replace with your own app_id if needed

    let totalProfitAmount = 0;
    let totalLossAmount = 0;
    let totalTradeCount = 0;
    let winTradeCount = 0;
    let lossTradeCount = 0;
    let newProfit = 0 ;
    let lossAmount = 0;
    let winCountPerRow = 0;
    let initialAccBalance = 0;
    const market = 'R_100';
    const tradeType = 'ACCU'; // Or 'MULTDOWN' for downward trades
    selectedMarket = market;
    interval = 1000;


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
            lastTradeId = response.buy.contract_id; // Save the trade's contract ID
            output.innerHTML += `Trade started:\nContract ID = ${lastTradeId}, Stake = ${response.buy.buy_price}, Market = ${selectedMarket}\n`;
            totalTradeCount = totalTradeCount + 1
            setTimeout(() => {
                fetchTradeDetails(lastTradeId);
            }, 3000);
        }


        if(response.msg_type === 'proposal_open_contract'){
            if(response.proposal_open_contract.contract_id === lastTradeId){
                const contract = response.proposal_open_contract;

                const profit = parseFloat(response.proposal_open_contract.profit);
                console.log(`Current profit: ${profit}`);

                if (contract.is_sold) {
                    const profit = contract.profit;
                    const result = profit > 0 ? 'Win' : 'Loss';

                    output.innerHTML += `Trade Result: <span style="color: ${profit > 0 ? 'green' : 'red'}; font-weight: 900;">${result}</span>, Profit: <span style="color: ${profit > 0 ? 'green' : 'red'}; font-weight: 900;">$${profit.toFixed(2)}</span>\n-------------------------------------\n`;

                    if( profit > 0){
                        totalProfitAmount = totalProfitAmount + profit;
                        winTradeCount = winTradeCount+1;
                        winCountPerRow = winCountPerRow+1;
                        lastTradeStatus = 'win';
                    } else {
                        totalLossAmount = totalLossAmount + profit;
                        lossTradeCount = lossTradeCount+1;
                        winCountPerRow = 0;
                        lastTradeStatus = 'loss';
                    }
                    lossAmount = lossAmount + profit
                    if(lossAmount > 0){lossAmount = 0;}

                    newProfit = totalProfitAmount + totalLossAmount;
                    const spanColor = newProfit > 0 ? 'green' : 'red';
                    reportUpdate(totalTradeCount, winTradeCount, lossTradeCount, totalProfitAmount, totalLossAmount, lossAmount, newProfit, initialAccBalance);
                    
                    // if(profit < 0){
                    //     interval = 1000;
                    // } else {
                    //     interval = 500;
                    // }

                    // if(lossAmount < 0){
                    //     // selectedMarket = getRandomMarket(marketArray, selectedMarket);
                    // }

                    // if(lossAmount < 0){
                    //     // selectedMarket = getRandomMarket(marketArray, selectedMarket);

                    //     setTimer(interval * 2);
                    //     setTimeout(() => {
                    //         makeTrades(); 
                    //     }, (interval * 2));
                    // } else {
                    //     setTimer(interval);
                    //     setTimeout(() => {
                    //         makeTrades(); 
                    //     }, (interval));
    
                    // }

                    // setTimer(interval);
                    // setTimeout(() => {
                        makeTrades(); 
                    // }, (interval));

                    output.scrollTop = output.scrollHeight;

                   
                } else {
                    setTimeout(() => {
                        fetchTradeDetails(lastTradeId);
                    }, 1000);
                }
            }
        }


    };



    const makeTrades = () => {
        placeTrade('DIGITOVER', 1, stake);
    };

    const getRandomMarket = (array, current) => {
        let randomIndex;
        let randomMarket;
    
        do {
            randomIndex = Math.floor(Math.random() * array.length);
            randomMarket = array[randomIndex];
        } while (randomMarket === current);
    
        return randomMarket;
    };

    const placeTrade = (tradeType, duration, newStake) => {
        const tradeRequest = {
            proposal: 1,
            amount: newStake, // $1 stake
            basis: 'stake',
            contract_type: tradeType, // 'DIGITOVER' or 'DIGITUNDER'
            currency: 'USD',
            duration: duration, // 1 tick
            duration_unit: 't',
            symbol: selectedMarket, // Market: Volatility 100 Index
            barrier: ldp, // Predict last digit is 1
        };

        // console.log('Sending trade request:', tradeRequest);
        ws.send(JSON.stringify(tradeRequest));
    };

    const reportUpdate = (totalTradeCount, winCount, lossCount, totalProfit, totalLoss, currentLossAmount, currentProfitAmount, initialAccBalance) => {
        // const totalResults = document.getElementById('totalResults'); // For displaying WebSocket messages

        // document.getElementById('initialAccBalance').innerHTML = response.authorize.balance;
        document.getElementById('totalTradeCount').innerHTML = totalTradeCount;
        document.getElementById('winCount').innerHTML = winCount;
        document.getElementById('lossCount').innerHTML = lossCount;
        let newAccBalance = initialAccBalance + currentProfitAmount;


        if(totalProfit < 0){
            document.getElementById('totalProfit').innerHTML = `<span style="color: red; font-weight: 900;">$${totalProfit}</span>`;
        } else if(totalProfit == 0){
            document.getElementById('totalProfit').innerHTML = `<span>$${totalProfit}</span>`;
        } else {
            document.getElementById('totalProfit').innerHTML = `<span style="color: green; font-weight: 900;">$${totalProfit}</span>`;
        }


        if(newAccBalance < initialAccBalance){
            document.getElementById('newAccBalance').innerHTML = `<span style="color: red; font-weight: 900;">$${newAccBalance}</span>`;
        } else if(newAccBalance == initialAccBalance){
            document.getElementById('newAccBalance').innerHTML = `<span>$${newAccBalance}</span>`;
        } else {
            document.getElementById('newAccBalance').innerHTML = `<span style="color: green; font-weight: 900;">$${newAccBalance}</span>`;
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

    const getAuthentication = () => {
        ws.send(JSON.stringify({
            authorize: apiToken
        }));
    }

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

};

function setTimer (time){
    var timeleft = (time / 1000);
    var downloadTimer = setInterval(function(){
        if(timeleft <= 0){
          clearInterval(downloadTimer);
          document.getElementById("countdown").innerHTML = "Finished";
          $('#countdown').removeClass("show");
          $('#countdown').addClass("hide");
        } else {
          $('#countdown').removeClass("hide");
          $('#countdown').addClass("show");
          document.getElementById("countdown").innerHTML = timeleft + " seconds remaining";
        }
        timeleft -= 1;
      }, 1000);
}