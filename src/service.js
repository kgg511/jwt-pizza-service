const express = require('express');
const { authRouter, setAuthUser } = require('./routes/authRouter.js');
const orderRouter = require('./routes/orderRouter.js');
const franchiseRouter = require('./routes/franchiseRouter.js');
const version = require('./version.json');
const config = require('./config.js');
const logger = require('./logger.js');
const app = express();

const { METRIC: Metric } = require("./metrics.js");
app.use(express.json());
app.use(Metric.requestTracker); //for grafana!
app.use(logger.httpLogger);

app.use(setAuthUser);
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  let startTime = Date.now();
  // req.path is correct, BEFORE RUNNING THE REQUEST
  // console.log(req.method, req.baseUrl, req.originalUrl, req.path);
  res.on("finish", () => {
    //console.log(req.method, req.baseUrl, req.originalUrl, req.path);
    Metric.updateAfterRequest(res, req, startTime);
  });

  next();
});

const apiRouter = express.Router();
app.use('/api', apiRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/order', orderRouter);
apiRouter.use('/franchise', franchiseRouter);

apiRouter.use('/docs', (req, res) => {
  res.json({
    version: version.version,
    endpoints: [...authRouter.endpoints, ...orderRouter.endpoints, ...franchiseRouter.endpoints],
    config: { factory: config.factory.url, db: config.db.connection.host },
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'welcome to JWT Pizza',
    version: version.version,
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    message: 'unknown endpoint',
  });
});

// Default error handler for all exceptions and errors.
app.use((err, req, res, next) => {
  // what was the path, the error, and how frequently?
  const key = `${req.method} ${req.path} ${err.statusCode ?? 500}`;
  Metric.errorCount[key] = (Metric.errorCount[key] || 0) + 1;
  Metric.errorCount['all'] = (Metric.errorCount['all'] || 0) + 1;

  //req.originalUrl
  logger.unhandledErrorLogger(err);
  res.status(err.statusCode ?? 500).json({ message: err.message, stack: err.stack });
  next();
});

module.exports = app;
