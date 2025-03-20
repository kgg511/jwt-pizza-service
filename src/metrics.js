const os = require('os');
const config = require('./config.js');

class Metric{

  constructor(){
    this.requests = {};
    this.endpoints = {}; // for storing endpoint
    this.success = 0; // number of successful logins/register
    this.failed = 0 // number of failed logins/register
    this.creationFailures = 0; //number of failed pizza creations
    this.pizzasSold = 0; // number of pizzas sold
    this.revenue = 0; // revenue from pizzas sold
    this.numRequestsCompleted = 0; // number of requests completed
    this.sumRequestDuration = 0; // sum of request durations
    this.sumDurationPizza = 0; // sum time spent on pizza creation
    this.activeUsers = [];
  }

  // required metrics:
  // HTTP requests by method/minute: total requests, get/put/post/delete
  // active users
  // authentication attempts/minutes: successful/failed
  // CPU and memory usage
  // Pizzas: sold/minute, creation failures, revenue/minute
  // latency: service endpoint, pizza creation
  updatePizzaMetrics(startTime, order){
    this.sumDurationPizza += Date.now() - startTime; // time for pizza creation
    this.pizzasSold += order.items.length; // number of pizzas sold
    order.items.forEach((item) => {
      console.log("Price: ", item.price); // revenue
      this.revenue += item.price;
    });
    console.log("CHAIR", order.items.length);
  }

  updateActiveUser(token, time){
    // check if token is in the list
    const activeTime = 180000// 3 minutes in milliseconds
    const userIndex = this.activeUsers.findIndex(user => user.token === token);
    if(userIndex != -1){ // if it's in the list
      this.activeUsers.splice(userIndex, 1); // remove 
    }
    this.activeUsers.push({token: token, time: time}); // put at end

    // remove inactive users
    const currentTime = Date.now();
    let newActiveIndex = 0;
    this.activeUsers.forEach((user, index) => {
      if(currentTime - user.time < activeTime){
        newActiveIndex = index;
      }
    });

    if(newActiveIndex > 0){
      this.activeUsers = this.activeUsers.slice(newActiveIndex);}
  }

  // tracking logic that occurs BEFORE the actual request occurs
  requestTracker = (req, res, next) => {
    const requestType = req.method;
    const path = req.path;
    console.log(requestType, path);
    this.requests[requestType] = (this.requests[requestType] || 0) + 1; //get/push/put/delete
    const startTime = Date.now(); // track the time it takes to process the request
    const token = req.headers.authorization;

    if (token && token.split(' ')[1]){ // if request made with a token
      const bearerToken = token.split(' ')[1];

      if (path == "/api/auth" && requestType == "DELETE"){ // logout removal from active users
        const userIndex = this.activeUsers.findIndex(user => user.token === bearerToken);
        if(userIndex != -1){ 
          this.activeUsers.splice(userIndex, 1);
          console.log("user no longer active due to logging out");
        }
      }
      else{ // update active user
        this.updateActiveUser(bearerToken, startTime);
      }
    }
      next();
    }

    updateAfterRequest(res, req, startTime){
      console.log("Request duration: ", Date.now() - startTime);
      console.log("Status code: ", res.statusCode, req.method, req.baseUrl);
      this.numRequestsCompleted++;
      this.sumRequestDuration += Date.now() - startTime; // time request took to execute
      const endpoint = req.originalUrl
      //req.baseUrl;
      // req.baseUrl is correct possible req.originalUrl, AFTER RUNNING THE REQUEST
      // PLEASE USE req.baseUrl or req.originalUrl NOT path here

      // login/register
      if (endpoint == "/api/auth" && (req.method == "POST" || req.method == "PUT")){
        if (req.body.token != undefined) { // login/register add to active users
          this.updateActiveUser(req.body.token, startTime);
        };

        if (res.statusCode == 200) { //successful login/register
          this.success++;
          console.log("Success: ", this.success);
        }
        else{ //failed login/register
          this.failed++;
          console.log("fail: ", this.failed);
        }
      }

    }

   getRequests(){
    const GET = this.requests['GET'] || 0;
    const POST = this.requests['POST'] || 0;
    const PUT = this.requests['PUT'] || 0;
    const DELETE = this.requests['DELETE'] || 0;
    const total = GET + POST + PUT + DELETE;
    return {GET, POST, PUT, total};
  }

   getCpuUsagePercentage() {
    const cpuUsage = os.loadavg()[0] / os.cpus().length;
    return Math.ceil(cpuUsage * 100);
  }

   getMemoryUsagePercentage() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsage = (usedMemory / totalMemory) * 100;
    return Math.ceil(memoryUsage);
  }

   getLatencyRequests(){
    const avgEndpointTime = this.numRequestsCompleted === 0 ? 0 : this.sumRequestDuration / this.numRequestsCompleted;
    const avgPizzaTime = this.pizzasSold === 0 ? 0 : this.sumDurationPizza / this.pizzasSold;
    return [Math.ceil(avgEndpointTime),  Math.ceil(avgPizzaTime)];
  }

   getActiveUsers(){
    return this.activeUsers.length;
  }


  // Creating the metric objects
  metric_object(name, value, type, unit, dataType = "asInt"){
    return {
      metricName: name,
      metricValue: value,
      type: type,
      unit: unit,
      dataType: dataType
    }
  }

   setRequests(metricsArray){
    const {GET, POST, PUT, total} = this.getRequests();
    console.log(GET, POST, PUT, total);
    const get_metric = this.metric_object("GET", GET, "sum", '1');
    const post_metric = this.metric_object("POST", POST, "sum", '1');
    const put_metric = this.metric_object("PUT", PUT, "sum", '1');
    const total_metric = this.metric_object("Total", total, "sum", '1');
    metricsArray.push(get_metric);
    metricsArray.push(post_metric);
    metricsArray.push(put_metric);
    metricsArray.push(total_metric);
  }

   setMemoryCpu(metricsArray){
      const mem = this.getMemoryUsagePercentage();
      const cpu = this.getCpuUsagePercentage();
      const cpu_metric = this.metric_object("CPU", cpu, "gauge", '%');
      const mem_metric = this.metric_object("Memory", mem, "gauge", '%');
      metricsArray.push(cpu_metric);
      metricsArray.push(mem_metric);
  }

   setAuthMetrics(metricsArray){
    const success_metric = this.metric_object("Success", this.success, "sum", '1');
    const failed_metric = this.metric_object("Fail", this.failed, "sum", '1');
    metricsArray.push(success_metric);
    metricsArray.push(failed_metric);
  }

   setPizzaMetrics(metricsArray){
    const pizzas_metric = this.metric_object("PizzasSold", this.pizzasSold, "sum", '1');
    const creation_metric = this.metric_object("CreationFailures", this.creationFailures, "sum", '1');
    const revenue_metric = this.metric_object("Revenue", this.revenue, "sum", '1', "asDouble");
    metricsArray.push(pizzas_metric);
    metricsArray.push(creation_metric);
    metricsArray.push(revenue_metric);
  }

   setLatencyMetrics(metricsArray){
    const [avgEndpointTime, avgPizzaTime] = this.getLatencyRequests();
    const endpoint_metric = this.metric_object("EndpointLatency", avgEndpointTime, "gauge", 'ms');
    const pizza_metric = this.metric_object("PizzaLatency", avgPizzaTime, "gauge", 'ms');
    metricsArray.push(endpoint_metric);
    metricsArray.push(pizza_metric);
  }

   setActiveUsers(metricsArray){
    const active_metric = this.metric_object("ActiveUsers", this.getActiveUsers(), "sum", '1');
    metricsArray.push(active_metric);
  }

    sendMetrics(){
      try { 
        let metricsArray = [];
        this.setMemoryCpu(metricsArray);
        this.setRequests(metricsArray);
        this.setAuthMetrics(metricsArray); 
        this.setPizzaMetrics(metricsArray);
        this.setActiveUsers(metricsArray);
        this.setLatencyMetrics(metricsArray);
        this.sendMetricToGrafana(metricsArray);
      } catch (error) {
        console.log('Error sending metrics', error);
      }
    }

  // Code for sending all the metrics over to grafana
   createSingleMetric(metricName, metricValue, type, unit, dataType = "asInt") {
    // attributes = { ...attributes, source: config.source };
      const OneMetric = {
        name: metricName,
        unit: unit,
        [type]: {
          dataPoints: [
            {
              [dataType]: metricValue,
              timeUnixNano: Date.now() * 1000000,
              attributes: [
                {
                   "key": "source",
                   "value": { "stringValue": config.metrics.source}
                }
             ]
            },
          ]
        }
      };
      
      if (type === 'sum') {
        // set attributes if there are attributes
      // Object.keys(attributes).forEach((key) => {
      //   OneMetric.sum.dataPoints[0].attributes.push({
      //     key: key,
      //     value: { stringValue: attributes[key] },
      //   });
      // });

        OneMetric[type].aggregationTemporality = 'AGGREGATION_TEMPORALITY_CUMULATIVE';
        OneMetric[type].isMonotonic = true;
      }
      return OneMetric;
    }
    
   getAllMetrics(metricsArray){
      //holds ALL METRICS
      return {
        resourceMetrics: [
          {
            scopeMetrics: [
              {
                metrics: metricsArray.map((metric) => this.createSingleMetric(metric.metricName, metric.metricValue, metric.type, metric.unit, metric.dataType))
              },
            ],
          },
        ],
      };
  }
    
   sendMetricToGrafana(metricsArray) {
    console.log('Sending metrics to Grafana');
      const metrics = this.getAllMetrics(metricsArray);
      console.log(metricsArray);
      console.log(this.activeUsers);
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


}

const METRIC = new Metric();
module.exports = { METRIC };

//sendMetricsPeriodically, requestTracker