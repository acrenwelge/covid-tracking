window.addEventListener('DOMContentLoaded', function() {
  let statContainer = document.getElementById('stats');
  let graphContainer = document.getElementById('graph');
  let ctx = document.getElementById('covid-chart').getContext('2d');
  let chart;
  let dailyBtn = document.getElementById('getUSDaily');
  let totalBtn = document.getElementById('getUSTotal');

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

  function createChart(data) {
    chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: getArrayOfDates(data),
        datasets: [
          {
            label: "Positive Tests",
            backgroundColor: 'red',
            data: getDataset(data, 'positive')
          },
          {
            label: "Negative Tests",
            backgroundColor: 'green',
            data: getDataset(data, 'negative')
          },
          {
            label: "Deaths",
            backgroundColor: 'black',
            data: getDataset(data, 'deaths')
          },
          {
            label: "Hospitalized",
            backgroundColor: 'grey',
            data: getDataset(data, 'hospitalized')
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

  let dailyBtnFunc = function(e) {
    let cacheData = localStorage.getItem('covid');
    if (cacheData) {
      createChart(JSON.parse(cacheData));
    } else {
      fetch('https://covidtracking.com/api/us/daily').then(resp => {
        return resp.json();
      }).then(data => {
        localStorage.setItem('covid', JSON.stringify(data));
        createChart(data);
      });
    }
    let btn = document.getElementById('toggleAxis');
    btn.hidden = false;
    btn.addEventListener('click', (e) => {
      toggleAxis();
    });
    dailyBtn.removeEventListener('click', dailyBtnFunc);
  }

  dailyBtn.addEventListener('click', dailyBtnFunc);
});
