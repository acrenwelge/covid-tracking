window.addEventListener('DOMContentLoaded', function() {
  let statContainer = document.getElementById('stats');
  let graphContainer = document.getElementById('graph');
  let ctx = document.getElementById('covid-chart').getContext('2d');
  let chart;
  let data;
  let dailyBtn = document.getElementById('getUSDaily');
  let totalBtn = document.getElementById('getUSTotal');
  let config = {
    model: 'exponential',
    viewIncreases: false
  }
  let regressionModel;

  let getTotalFunc = function(e) {
    fetch('https://covidtracking.com/api/us').then(resp => {
      return resp.json();
    }).then(data => {
      let ul = document.createElement('ul');
      let dataObj = data[0];
      for (key in dataObj) {
        let li = document.createElement('li');
        li.textContent = `${key}: ${dataObj[key]}`
        ul.appendChild(li);
      }
      statContainer.appendChild(ul);
    });
    totalBtn.removeEventListener('click', getTotalFunc);
  }

  totalBtn.addEventListener('click', getTotalFunc);

  function getArrayOfDates(data) {
    let arr = [];
    for (obj of data) {
      arr.push(obj.date);
    }
    return arr;
  }

  function getDataset(data, attribute) {
    let arr = [];
    for (obj of data) {
      arr.push(obj[attribute]);
    }
    return arr;
  }

  function getRegressionData(dates, regrInput) {
    let extractData = (arr2d) => {
      let newData = [];
      for (let arr of arr2d) {
        newData.push(arr[1]);
      }
      return newData;
    }
    let regrData = [];
    for (let x=0; x < dates.length; x++) {
      regrData.push([x, regrInput[x]]);
    }
    if (config.model === 'exponential') {
       regressionModel = regression.exponential(regrData);
    } else if (config.model === 'power') {
      regressionModel = regression.power(regrData);
    } else if (config.model === 'polynomial') {
      regressionModel = regression.polynomial(regrData);
    } else if (config.model === 'linear') {
      regressionModel = regression.linear(regrData);
    }
    return extractData(regressionModel.points);
  }

  function createChart() {
    // put the data in the right order (chronologically)
    data = data.sort((first, second) => first.date - second.date);
    // x axis
    let dates = getArrayOfDates(data);
    // datasets
    let posCases, negCases, deaths, hospitalized;
    if (config.viewIncreases) {
      posCases = getDataset(data, 'positiveIncrease');
      negCases = getDataset(data, 'negativeIncrease');
      deaths = getDataset(data, 'deathIncrease');
      hospitalized = getDataset(data, 'hospitalizedIncrease');
    } else {
      posCases = getDataset(data, 'positive');
      negCases = getDataset(data, 'negative');
      deaths = getDataset(data, 'death');
      hospitalized = getDataset(data, 'hospitalized');
    }
    // regression
    let regressionData = getRegressionData(dates, posCases);
    // create chart
    chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: getArrayOfDates(data),
        datasets: [
          {
            label: "Positive Tests",
            pointBackgroundColor: 'red',
            borderColor: 'red',
            data: posCases
          },
          {
            label: "Positive Case Regression",
            pointBackgroundColor: 'yellow',
            borderColor: 'yellow',
            data: regressionData
          },
          {
            label: "Negative Tests",
            pointBackgroundColor: 'green',
            borderColor: 'green',
            data: negCases
          },
          {
            label: "Deaths",
            backgroundColor: 'black',
            data: deaths
          },
          {
            label: "Hospitalized",
            backgroundColor: 'grey',
            data: hospitalized
          }
      ]
      },
      options: {
        responsive: true
      }
    });
  }

  function toggleAxis() {
    let axisType = chart.options.scales.yAxes[0].type === 'logarithmic' ? 'linear' : 'logarithmic';
    chart.options.scales = {
      yAxes: [{
        display: true,
        type: axisType
      }]
    };
    chart.update();
  }

  function init() {
    fetch('https://covidtracking.com/api/us/daily').then(resp => {
      return resp.json();
    }).then(newData => {
      data = newData;
      createChart();
    });
    let axisBtn = document.getElementById('toggleAxis');
    axisBtn.hidden = false;
    axisBtn.addEventListener('click', (e) => {
      toggleAxis();
    });
    document.getElementById('select-model').addEventListener('change', (e) => {
      console.log('selected new model');
      config.model = e.target.value;
      console.log(`rebuilding with ${config.model}`);
      createChart();
    });
    document.getElementById('predict-btn').addEventListener('click', (e) => {
      let days = Number(document.getElementById('predict-input').value) - 1;
      console.log(`array length: ${data.length} - days = ${days}`);
      let prediction = regressionModel.predict(data.length + days);
      let predictVal = Number(prediction[1].toFixed(0)).toLocaleString();
      let predictDays = prediction[0].toLocaleString();
      document.getElementById('result').textContent = `Model predicts ${predictVal} cases on day ${predictDays}`;
    });
    document.getElementById('toggleViewIncreases').addEventListener('click', (e) => {
      config.viewIncreases = !config.viewIncreases;
      createChart();
    });
  }

  init();
});
