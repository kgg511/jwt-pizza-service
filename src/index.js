const app = require('./service.js');

const { sendMetricsPeriodically } = require('./metrics');
sendMetricsPeriodically(10000);

const port = process.argv[2] || 3000;
app.listen(port, () => {
  console.log(`Server started on porte ${port}`);
});
