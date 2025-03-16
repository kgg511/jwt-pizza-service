const app = require('./service.js');
const { METRIC: Metric } = require('./metrics'); //metrics object

setInterval(() => {
  Metric.sendMetrics();      
}, 10000);

const port = process.argv[2] || 3000;
app.listen(port, () => {
  console.log(`Server started on porte ${port}`);
});
