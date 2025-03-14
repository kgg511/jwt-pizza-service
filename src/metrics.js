const os = require('os');
const config = require('./config.js');

const requests = {};
const endpoints = {}; // for storing endpoint


let success = 0; // number of successful logins/register
let failed = 0 // number of failed logins/register

let creationFailures = 0; //number of failed pizza creations
let pizzasSold = 0; // number of pizzas sold
let revenue = 0; // revenue from pizzas sold

let numRequestsCompleted = 0; // number of requests completed
let sumRequestDuration = 0; // sum of request durations

let sumDurationPizza = 0; // sum time spent on pizza creation

let activeUsers = [];

// required metrics:
// HTTP requests by method/minute: total requests, get/put/post/delete
// active users
// authentication attempts/minutes: successful/failed
// CPU and memory usage
// Pizzas: sold/minute, creation failures, revenue/minute
// latency: service endpoint, pizza creation

function updateActiveUser(token, time){
  // check if token is in the list
  activeTime = 180000// 3 minutes in milliseconds
  userIndex = activeUsers.findIndex(user => user.token === token);
  if(userIndex != -1){ // if it's in the list
    activeUsers.splice(userIndex, 1); // remove 
  }
  activeUsers.push({token: token, time: time}); // put at end

  // remove inactive users
  const currentTime = Date.now();
  let newActiveIndex = 0;
  activeUsers.forEach((user, index) => {
    if(currentTime - user.time < activeTime){
      newActiveIndex = index;
    }
  });

  if(newActiveIndex > 0){activeUsers = activeUsers.slice(newActiveIndex);}
  
}

// function to track the requests (GET, POST, PUT, DELETE)
function requestTracker(req, res, next) {
  const requestType = req.method;
  const path = req.path;
  requests[requestType] = (requests[requestType] || 0) + 1; //get/push/put/delete
  const startTime = Date.now(); // track the time it takes to process the request
  const token = req.headers.authorization;

  if (token && token.split(' ')[1]){ // if request made with a token
    const bearerToken = token.split(' ')[1];
    console.log("Bearer Token:", bearerToken, req.user);

    if (path == "/api/auth" && requestType == "DELETE"){ // logout removal from active users
      const userIndex = activeUsers.findIndex(user => user.token === bearerToken);
      if(userIndex != -1){ 
        activeUsers.splice(userIndex, 1);
        console.log("user no longer active due to logging out");
      }
    }
    else{ // update active user
      updateActiveUser(bearerToken, startTime);
    }
  }

  res.on("finish", () => {
    numRequestsCompleted++;
    sumRequestDuration += Date.now() - startTime; // time request took to execute

    // login/register
    if (path == "/api/auth" && (requestType == "POST" || requestType == "PUT")){
      if (req.body.token != undefined) { // login/register add to active users
        updateActiveUser(req.body.token, startTime);
      };

      if (res.statusCode == 200) { //authentication
        success++;
        console.log("Success: ", success);
      }
      else{
        failed++;
        console.log("fail: ", failed);
      }
    }

    // order pizza: # sold, # create failures, revenue/minute
    else if(path == "/api/order" && requestType == "POST"){
      if (res.statusCode == 200) {
        pizzasSold += req.body.items.length; // number of pizzas sold

        // calculate revenue
        req.body.items.forEach((item) => {
          console.log("Price: ", item.price);
          revenue += item.price;
        });
        sumDurationPizza += Date.now() - startTime; // time to create pizza
      }
      else{ 
        creationFailures += 1;
        console.log("Pizza creation failed");
      }
    }

  });

  console.log("Request duration: ", Date.now() - startTime);
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
  return Math.ceil(cpuUsage * 100);
}

function getMemoryUsagePercentage() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryUsage = (usedMemory / totalMemory) * 100;
  return Math.ceil(memoryUsage);
}

function getLatencyRequests(){
  avgEndpointTime = numRequestsCompleted === 0 ? 0 : sumRequestDuration / numRequestsCompleted;
  avgPizzaTime = pizzasSold === 0 ? 0 : sumDurationPizza / pizzasSold;
  return [Math.ceil(avgEndpointTime),  Math.ceil(avgPizzaTime)];
}

function getActiveUsers(){
  return activeUsers.length;
}

function setRequests(metricsArray){
  const {GET, POST, PUT, total} = getRequests();
  console.log(GET, POST, PUT, total);
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
    console.log("MEMCPU", mem, cpu);
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

function metric_object(name, value, type, unit, dataType = "asInt"){
  return {
    metricName: name,
    metricValue: value,
    type: type,
    unit: unit,
    dataType: dataType
  }
}

function setAuthMetrics(metricsArray){
  const success_metric = metric_object("Success", success, "sum", '1');
  const failed_metric = metric_object("Fail", failed, "sum", '1');
  console.log("Auth", success, failed);
  metricsArray.push(success_metric);
  metricsArray.push(failed_metric);
}

function setPizzaMetrics(metricsArray){
  const pizzas_metric = metric_object("PizzasSold", pizzasSold, "sum", '1');
  const creation_metric = metric_object("CreationFailures", creationFailures, "sum", '1');
  const revenue_metric = metric_object("Revenue", revenue, "sum", '1', "asDouble");
  metricsArray.push(pizzas_metric);
  metricsArray.push(creation_metric);
  metricsArray.push(revenue_metric);
  console.log("Pizza", pizzasSold, creationFailures, revenue);
}

function setLatencyMetrics(metricsArray){
  const [avgEndpointTime, avgPizzaTime] = getLatencyRequests();
  //avg time...
  const highbound_endpoint = metric_object("Max Latency Desired", 50, "gauge", 'ms');
  const endpoint_metric = metric_object("EndpointLatency", avgEndpointTime, "gauge", 'ms');
  const pizza_metric = metric_object("PizzaLatency", avgPizzaTime, "gauge", 'ms');
  metricsArray.push(highbound_endpoint);
  metricsArray.push(endpoint_metric);
  metricsArray.push(pizza_metric);
  console.log("Latency", avgEndpointTime, avgPizzaTime);
}

function setActiveUsers(metricsArray){
  const active_metric = metric_object("ActiveUsers", getActiveUsers(), "sum", '1');
  metricsArray.push(active_metric);
}


// purchase metrics (REMEMBER YOU CAN CHANGE THIS)
function sendMetricsPeriodically(period) {
    setInterval(() => {
      try { 
        let metricsArray = [];
        setMemoryCpu(metricsArray);
        setRequests(metricsArray);
        setAuthMetrics(metricsArray); 
        setPizzaMetrics(metricsArray);
        setActiveUsers(metricsArray);
        setLatencyMetrics(metricsArray);
        console.log(activeUsers);
        // console.log(activeUsers.length);
        sendMetricToGrafana(metricsArray);
      } catch (error) {
        console.log('Error sending metrics', error);
      }
    }, period);
  }



// Code for sending all the metrics over to grafana
function createSingleMetric(metricName, metricValue, type, unit, dataType = "asInt", attributes = {}) {
  attributes = { ...attributes, source: config.source };
    const OneMetric = {
      name: metricName,
      unit: unit,
      [type]: {
        dataPoints: [
          {
            [dataType]: metricValue,
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
              metrics: metricsArray.map((metric) => createSingleMetric(metric.metricName, metric.metricValue, metric.type, metric.unit, metric.dataType))
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