const os = require('os');
const config = require('./config.js');
const requests = {};


// required metrics:
// HTTP requests by method/minute: total requests, get/put/post/delete
// active users
// authentication attempts/minutes: successful/failed
// CPU and memory usage
// Pizzas: sold/minute, creation failures, revenue/minute
// latency: service endpoint, pizza creation


// function to track the requests (GET, POST, PUT, DELETE)
function requestTracker(req, res, next) {
  const requestType = req.method;
  requests[requestType] = (requests[requestType] || 0) + 1;
  console.log("Request Tracker: ", requestType);
    next();
  }

function getRequests(){
  const GET = requests['GET'] || 0;
  const POST = requests['POST'] || 0;
  const PUT = requests['PUT'] || 0;
  const DELETE = requests['DELETE'] || 0;
  const total = GET + POST + PUT + DELETE;
  return {GET, POST, PUT, total};
}

function getCpuUsagePercentage() {
  const cpuUsage = os.loadavg()[0] / os.cpus().length;
  return cpuUsage.toFixed(2) * 100;
}

function getMemoryUsagePercentage() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryUsage = (usedMemory / totalMemory) * 100;
  return Math.ceil(memoryUsage);
}

function setRequests(metricsArray){
  const {GET, POST, PUT, total} = getRequests();
  const get_metric = {
    metricName: "GET",
    metricValue: GET,
    type: "sum",
    unit: '1' //unit of 1 means a counter
  }
  const post_metric = {
    metricName: "POST",
    metricValue: POST,
    type: "sum",
    unit: '1'
  }
  const put_metric = {
    metricName: "PUT",
    metricValue: PUT,
    type: "sum",
    unit: "1"
  }
  const total_metric = {
    metricName: "Total",
    metricValue: total,
    type: "sum",
    unit: "1"
  }
  metricsArray.push(get_metric);
  metricsArray.push(post_metric);
  metricsArray.push(put_metric);
  metricsArray.push(total_metric);
}

function setMemoryCpu(metricsArray){
    const mem = getMemoryUsagePercentage();
    const cpu = getCpuUsagePercentage();
    const cpu_metric = {
      metricName: "CPU",
      metricValue: cpu,
      type: "gauge",
      unit: "%"
    }
    const mem_metric = {
      metricName: "Memory",
      metricValue: mem,
      type: "gauge",
      unit: "%"
    }
    metricsArray.push(cpu_metric);
    metricsArray.push(mem_metric);
}


// purchase metrics (REMEMBER YOU CAN CHANGE THIS)
function sendMetricsPeriodically(period) {
    setInterval(() => {
      try { 
        let metricsArray = [];
        setMemoryCpu(metricsArray);
        setRequests(metricsArray);
        // httpMetrics(buf); //use: buf.addMetric('http_requests', 100);
        // systemMetrics(buf);
        // userMetrics(buf);
        // purchaseMetrics(buf);
        // authMetrics(buf);
        sendMetricToGrafana(metricsArray);
      } catch (error) {
        console.log('Error sending metrics', error);
      }
    }, period);
  }


//attributes { endpoint: 'getGreeting' }

// Code for sending all the metrics over to grafana
function createSingleMetric(metricName, metricValue, type, unit, attributes = {}) {
  attributes = { ...attributes, source: config.source };
    const OneMetric = {
      name: metricName,
      unit: unit,
      [type]: {
        dataPoints: [
          {
            asInt: metricValue,
            timeUnixNano: Date.now() * 1000000,
            attributes: []
          },
        ]
      }
    };
 

    
    if (type === 'sum') {
      // set attributes if there are attributes
    Object.keys(attributes).forEach((key) => {
      OneMetric.sum.dataPoints[0].attributes.push({
        key: key,
        value: { stringValue: attributes[key] },
      });
    });

      OneMetric[type].aggregationTemporality = 'AGGREGATION_TEMPORALITY_CUMULATIVE';
      OneMetric[type].isMonotonic = true;
    }
    return OneMetric;
  }
  
function getAllMetrics(metricsArray){
    //holds ALL METRICS
    return {
      resourceMetrics: [
        {
          scopeMetrics: [
            {
              metrics: metricsArray.map((metric) => createSingleMetric(metric.metricName, metric.metricValue, metric.type, metric.unit))
            },
          ],
        },
      ],
    };
}
  
function sendMetricToGrafana(metricsArray) {
  console.log('Sending metrics to Grafana');
    const metrics = getAllMetrics(metricsArray);
    const body = JSON.stringify(metrics);
    fetch(`${config.metrics.url}`, {
      method: 'POST',
      body: body,
      headers: { Authorization: `Bearer ${config.metrics.userId}:${config.metrics.apiKey}`, 'Content-Type': 'application/json' },
    })
      .then((response) => {
        if (!response.ok) {
          response.text().then((text) => {
            console.error(`Failed to push metrics data to Grafana: ${text}\n${body}`);
          });
        } else {
          console.log(`Pushed all metrics`);
        }
      })
      .catch((error) => {
        console.error('Error pushing metrics:', error);
      });
}



module.exports = { sendMetricsPeriodically, requestTracker };