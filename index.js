window.addEventListener('DOMContentLoaded', function() {
  const apiURL = 'https://covidtracking.com/api';
  let statContainer = document.getElementById('stats');
  let lineGraphContainer = document.getElementById('line-graph-container');
  let lineGraph;
  let lineGraphData;
  let pieChartContainer = document.getElementById('pie-chart-container');
  let pieChart;
  let pieChartData;
  let dailyBtn = document.getElementById('getUSDaily');
  let config = {
    model: 'exponential',
    viewIncreases: false
  }
  let regressionModel;

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

  function createLineGraph() {
    // put the data in the right order (chronologically)
    lineGraphData = lineGraphData.sort((first, second) => first.date - second.date);
    // x axis
    let dates = getArrayOfDates(lineGraphData);
    // datasets
    let posCases, negCases, deaths, hospitalized;
    if (config.viewIncreases) {
      posCases = getDataset(lineGraphData, 'positiveIncrease');
      negCases = getDataset(lineGraphData, 'negativeIncrease');
      deaths = getDataset(lineGraphData, 'deathIncrease');
      hospitalized = getDataset(lineGraphData, 'hospitalizedIncrease');
    } else {
      posCases = getDataset(lineGraphData, 'positive');
      negCases = getDataset(lineGraphData, 'negative');
      deaths = getDataset(lineGraphData, 'death');
      hospitalized = getDataset(lineGraphData, 'hospitalized');
    }
    // regression
    let regressionData = getRegressionData(dates, posCases);
    // create line graph
    let lineCtx = document.getElementById('line-graph').getContext('2d');
    lineGraph = new Chart(lineCtx, {
      type: 'line',
      data: {
        labels: getArrayOfDates(lineGraphData),
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
        responsive: true,
        scales: {
            yAxes: [{
                ticks: {
                    beginAtZero: true
                }
            }]
        }
      }
    });
  }

  function toggleAxis() {
    let axisType = lineGraph.options.scales.yAxes[0].type === 'logarithmic' ? 'linear' : 'logarithmic';
    lineGraph.options.scales = {
      yAxes: [{
        display: true,
        type: axisType
      }]
    };
    lineGraph.update();
  }

  function createPieChart() {
    let pieCtx = document.getElementById('pie-chart').getContext('2d');
    let nonHosp = Number(pieChartData.positives - pieChartData.hosp);
    pieChart = new Chart(pieCtx, {
      type: 'pie',
      data: {
        datasets: [
          {
            data: [nonHosp, pieChartData.hosp, pieChartData.dead],
            backgroundColor: ['red', 'blue', 'green']
          }
        ],
        labels: ['Not Hospitalized', 'Hospitalized', 'Deaths']
      },
      options: {
        responsive: true
      }
    });
    console.debug(`pie chart data: ${JSON.stringify(pieChartData)}`);
    pieChartContainer.removeAttribute('hidden');
  }

  function init() {
    fetch(`${apiURL}/us/daily`).then(resp => {
      return resp.json();
    }).then(newData => {
      lineGraphData = newData;
      createLineGraph();
    });
    let axisBtn = document.getElementById('toggleAxis');
    axisBtn.hidden = false;
    axisBtn.addEventListener('click', (e) => {
      toggleAxis();
    });
    document.getElementById('select-model').addEventListener('change', (e) => {
      console.debug('selected new model');
      config.model = e.target.value;
      console.debug(`rebuilding with ${config.model}`);
      createLineGraph();
    });
    document.getElementById('predict-btn').addEventListener('click', (e) => {
      let days = Number(document.getElementById('predict-input').value) - 1;
      let prediction = regressionModel.predict(lineGraphData.length + days);
      let predictVal = Number(prediction[1].toFixed(0));
      let predictDays = prediction[0];
      document.getElementById('result').textContent = `Model predicts ${predictVal.toLocaleString()} cases on day ${predictDays}`;
    });
    document.getElementById('toggleViewIncreases').addEventListener('click', (e) => {
      config.viewIncreases = !config.viewIncreases;
      if (config.viewIncreases) {
        e.target.textContent = "View Cumulative Data";
      } else {
        e.target.textContent = "View Daily Increases";
      }
      createLineGraph();
    });
    let totalBtn = document.getElementById('getUSTotal');
    let totalBtnFunc = () => {
      if (pieChartData) {
        pieChartContainer.toggleAttribute('hidden');
      } else {
        fetch(`${apiURL}/us`).then(resp => {
          return resp.json();
        }).then(data => {
          let span = document.createElement('span');
          let d = data[0];
          pieChartData = {
            time: new Date(d.lastModified),
            totTests: d.totalTestResults,
            positives: d.positive,
            hosp: d.hospitalizedCumulative,
            icu: d.inIcuCumulative,
            vent: d.onVentilatorCumulative,
            dead: d.death,
            recovered: d.recovered,
          };
          span.textContent = `As of ${pieChartData.time.toLocaleTimeString()}, there have been ${pieChartData.totTests.toLocaleString()} total tests conducted.
          \n
            Of those, ${pieChartData.positives.toLocaleString()} have been positive, with ${pieChartData.hosp.toLocaleString()} requiring hospitalization
            and ${pieChartData.icu.toLocaleString()} requiring intensive care.
          \n
          ${pieChartData.vent.toLocaleString()} people infected have required ventilators
            and ${pieChartData.dead.toLocaleString()} people have died. ${pieChartData.recovered.toLocaleString()} people have recovered so far.`;
          span.style.fontWeight = 'bold';
          statContainer.appendChild(span);
          createPieChart();
        });
      totalBtn.removeEventListener('click', totalBtnFunc);
      }
    }
    totalBtn.addEventListener('click', totalBtnFunc);
  }

  init();
});
