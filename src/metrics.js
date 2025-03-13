const os = require('os');
const config = require('./config.js');
const requests = {};
const endpoints = {}; // for storing endpoint

let success = 0; // number of successful logins/register
let failed = 0 // number of failed logins/register


// required metrics:
// HTTP requests by method/minute: total requests, get/put/post/delete
// active users
// authentication attempts/minutes: successful/failed
// CPU and memory usage
// Pizzas: sold/minute, creation failures, revenue/minute
// latency: service endpoint, pizza creation

//active user: store all the ids & time, sorted by time
// remove the ones within a certain time frame, add users 
// user and the last time they did something..if you are in there you are active

// authentication attempts: just look for login requests, and 
// whether they succeed or not

// track the number of times accessing the login/register endpoint and succeeding
// function to track the requests (GET, POST, PUT, DELETE)
function requestTracker(req, res, next) {
  const requestType = req.method;
  requests[requestType] = (requests[requestType] || 0) + 1; //get/push/put/delete

  if (req.path == "/api/auth" && (req.method == "POST" || req.method == "PUT")) {
    res.on("finish", () => {
      if (res.statusCode == 200) {
        success++;
        console.log("Success: ", success);
      }
      else{
        failed++;
        console.log("fail: ", failed);
      }
    });
  }
  console.log("Request Tracker: ", requestType);
    next();
  }


// if it's login or register, we track it and then check if it was successful


  // incorrect order
  // endpoint in pizza factory, order 20 pizzas + automatically fails

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

function metric_object(name, value, type, unit){
  return {
    metricName: name,
    metricValue: value,
    type: type,
    unit: unit
  }
}

function setAuthMetrics(metricsArray){
  const success_metric = metric_object("Success", success, "sum", '1');
  const failed_metric = metric_object("Fail", failed, "sum", '1');
  metricsArray.push(success_metric);
  metricsArray.push(failed_metric);
}


// purchase metrics (REMEMBER YOU CAN CHANGE THIS)
function sendMetricsPeriodically(period) {
    setInterval(() => {
      try { 
        let metricsArray = [];
        setMemoryCpu(metricsArray);
        setRequests(metricsArray);
        setAuthMetrics(metricsArray)
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