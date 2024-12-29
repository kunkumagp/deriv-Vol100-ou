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