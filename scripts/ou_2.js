

function runOverUnder2Script() {
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

runOverUnder2Script();

function startWebSocket() {
    ws = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089'); // Replace with your own app_id if needed
    let responseCount = 0;
    let isTradeOpen = false;
    let ldp = 2;
    let lastTradeId = null;
    let primaryProposalObject = null;
    let secondaryProposalObject = null;
    let subscriptionId = null;
    let currentlastDigit = 0;

    let totalProfitAmount = 0;
    let totalLossAmount = 0;
    let totalTradeCount = 0;
    let winTradeCount = 0;
    let lossTradeCount = 0;
    let newProfit = 0 ;
    let lossAmount = 0;
    let initAccBalance = 0;
    let martingale = true;
    let tradeCountsPerRun = null;

    let newStake = stake;
    let profitRate = 0.4; // 40% profit rate

    ws.onopen = function () {
        // Authenticate
        getAuthentication();
        output.innerHTML += 'WebSocket connection opened.\n-------------------------------------\n';
    };

    ws.onmessage = function (event) { 

        const response = JSON.parse(event.data);
        responseCount = responseCount + 1;

        // console.log(`Response ${responseCount} - `, response);

        if (response.msg_type === 'authorize') {
            console.log('Authorization successful.');
            initAccBalance = response.authorize.balance;

            totalResults.innerHTML = `Initial Account Balance : $${initAccBalance}\nProfit: $${totalProfitAmount}\nLoss: $${totalLossAmount}\n\n-----------------------------\n\nTotal Trade Count: ${totalTradeCount}\nWin Count: ${winTradeCount}\nLoss Count: ${lossTradeCount}\n\n-----------------------------\n\nLoss Amount: $${lossAmount}\nNew Profit : <span style="font-weight: 900;">$${newProfit}</span>  \n`;


            placeTrade('DIGITOVER', 1, newStake);
        }

        if (response.msg_type === 'proposal') {
            // console.log('isTradeOpen - ', isTradeOpen);

            if(!isTradeOpen){

                if(primaryProposalObject != null && secondaryProposalObject == null){
                    secondaryProposalObject = response;
                } else if(primaryProposalObject == null && secondaryProposalObject == null){
                    primaryProposalObject = response;
                    placeTrade('DIGITOVER', 2, newStake);
                }

                if(primaryProposalObject != null && secondaryProposalObject != null){
                    // console.log('primaryProposalObject - ', primaryProposalObject);
                    // console.log('secondaryProposalObject - ', secondaryProposalObject);
                    // console.log('Ready to Trade');
                    
                    startTicks();
                }
            }
        }

        // Handle tick updates
        if (response.msg_type === 'tick') {
            const tick = response.tick;
            let buyRequest = null;

            // Check if the response contains the subscription ID
            if (response.subscription && response.subscription.id) {
                subscriptionId = response.subscription.id; // Store the subscription ID
                // console.log("Subscribed with ID:", subscriptionId);
            }


            // ticksHandle(tick);
            currentlastDigit = parseInt(tick.quote.toString().slice(-1), 10); // Get the last digit

            console.log(`Last Digit - `, currentlastDigit);
            
            if(currentlastDigit == ldp){
                console.log('Proposal Response:', secondaryProposalObject);

                buyRequest = {
                    buy: secondaryProposalObject.proposal.id,
                    price: secondaryProposalObject.proposal.ask_price,
                };
                ws.send(JSON.stringify(buyRequest));
            }


            if(currentlastDigit < ldp){
                console.log('Proposal Response:', primaryProposalObject);

                buyRequest = {
                    buy: primaryProposalObject.proposal.id,
                    price: primaryProposalObject.proposal.ask_price,
                };
                ws.send(JSON.stringify(buyRequest));
            }

        }

        if (response.msg_type === 'buy') {
            console.log('Trade Successful:', response);
            lastTradeId = response.buy.contract_id; // Save the trade's contract ID
            output.innerHTML += `Trade started:\nContract ID = ${lastTradeId}\nStake = ${response.buy.buy_price}, Last Digit = ${currentlastDigit}\n`;
            totalTradeCount = totalTradeCount + 1
            isTradeOpen = true;
            console.log('Contract id - ',lastTradeId);
            stopTicks();
            setTimeout(() => {fetchTradeDetails(lastTradeId);}, 1000);
        }

        if(response.msg_type === 'proposal_open_contract'){
            // console.log('contract_id - ',response.proposal_open_contract.contract_id);
            // console.log('lastTradeId - ',lastTradeId);
            
            if(response.proposal_open_contract.contract_id === lastTradeId){
                const contract = response.proposal_open_contract;

                if (contract.is_sold) {
                    primaryProposalObject = null;
                    secondaryProposalObject = null;
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
                    totalResults.innerHTML = `Initial Account Balance : $${initAccBalance}\nProfit: $${totalProfitAmount}\nLoss: $${totalLossAmount}\n\n-----------------------------\n\nTotal Trade Count: ${totalTradeCount}\nWin Count: ${winTradeCount}\nLoss Count: ${lossTradeCount}\n\n-----------------------------\n\nLoss Amount: $${lossAmount}\nNew Profit : <span style="color: ${spanColor}; font-weight: 900;">$${newProfit}</span>  \n`;
                    
                    isTradeOpen = false;

                    if(martingale){
                        if( profit > 0){
                            // newStake = stake; 
                            console.log(`Trade win`); 

                            let result = calculateNextBet(stake, profitRate, lossAmount, 'win');
                            console.log(`Next bet: $${result.nextBet}, Total loss: $${result.totalLoss}`); 
                            newStake = result.nextBet;

                        } else {
                            // newStake = newStake * 3;
                            console.log(`Trade loss`); 
                            console.log(`newStake - ${newStake}`); 
                            console.log(`totalLossAmount - ${lossAmount}`); 
                            let result = calculateNextBet(newStake, profitRate, lossAmount, 'loss');
                            console.log(`Next bet: $${result.nextBet}, Total loss: $${result.totalLoss}`);
                            newStake = result.nextBet;
                        }
                    }

                    console.log('Trade closed as ',result);
                    console.log('-------------------------');

                    // placeTrade('DIGITOVER', 1, newStake);

                    if( profit > 0){
                        scriptRunInLoop(true); 
                    } else {
                        scriptRunInLoop(false); 
                        // setTimeout(() => {fetchTradeDetails(lastTradeId);}, 2000); 
                    }
                    

                } else { setTimeout(() => {fetchTradeDetails(lastTradeId);}, 2000); }
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



    // Const Functions

    const getAuthentication = () => {
        ws.send(JSON.stringify({
            authorize: apiToken
        }));
    }

    // Place a trade (called after signal analysis)
    const placeTrade = (tradeType, duration, newStake) => {
        const tradeRequest = {
            proposal: 1,
            amount: newStake, // $1 stake
            basis: 'stake',
            contract_type: tradeType, // 'DIGITOVER' or 'DIGITUNDER'
            currency: 'USD',
            duration: duration, // 1 tick
            duration_unit: 't',
            symbol: market, // Market: Volatility 100 Index
            barrier: ldp, // Predict last digit is 1
        };

        // console.log('Sending trade request:', tradeRequest);
        ws.send(JSON.stringify(tradeRequest));
    };

    // Subscribe to tick updates
    const startTicks = () => {
        ws.send(JSON.stringify({
            ticks: market,
            subscribe: 1,
        }));
    };
    
    // Unsubscribe to tick updates
    const stopTicks = () => {
        ws.send(JSON.stringify({
            forget: subscriptionId, // Use the stored subscription ID
        }));
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
        console.log("Waiting for close contract...");
        ws.send(JSON.stringify(contractDetailsRequest));
    }

    const scriptRunInLoop = (isLastTradeWin) =>{

        if(isLastTradeWin){
            if(tradeCountsPerRun == null){
                placeTrade('DIGITOVER', 1, newStake);
            } else {
                if(totalTradeCount < tradeCountsPerRun){
                    placeTrade('DIGITOVER', 1, newStake);
                } else if(totalTradeCount >= tradeCountsPerRun){
                    let text = totalResults.innerHTML.replaceAll(/\n\n-----------------------------/g,"");
                    text += `\n-----------------------------\n`;
                    results.innerHTML += text;
    
                    webSocketConnectionStop();
                    setTimeout(() => {webSocketConnectionStart();}, 2000);
                }
            }
        } else {
            if(tradeCountsPerRun == null){
                setTimeout(() => {placeTrade('DIGITOVER', 1, newStake);}, 5000);
            } else {
                if(totalTradeCount < tradeCountsPerRun){
                    setTimeout(() => {placeTrade('DIGITOVER', 1, newStake);}, 5000);
                } else if(totalTradeCount >= tradeCountsPerRun){
                    let text = totalResults.innerHTML.replaceAll(/\n\n-----------------------------/g,"");
                    text += `\n-----------------------------\n`;
                    results.innerHTML += text;

                    webSocketConnectionStop();
                    setTimeout(() => {webSocketConnectionStart();}, 5000);
                }
            }
        }

    };


    function calculateNextBet(currentBet, profitRate, previousLosses, outcome) {
        if (outcome === "win") {
            // If the bet is won, reset to the initial bet amount.
            newStake = currentBet;   
            return {
                nextBet: currentBet,
                totalLoss: 0
            };
        } else if (outcome === "loss") {
            // If the bet is lost, add the current bet to the total losses
            // const totalLoss = Math.abs(previousLosses) + currentBet;
            const totalLoss = Math.abs(previousLosses);
            // Calculate the next bet required to recover the total loss
            const nextBet = totalLoss / profitRate;
            return {
                nextBet: Math.ceil(nextBet), // Round up to the nearest whole number
                totalLoss: totalLoss
            };
        } else {
            throw new Error("Invalid outcome. Use 'win' or 'loss'.");
        }
    }

}