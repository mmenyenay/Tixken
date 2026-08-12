require('dotenv').config();
const express = require('express');
const app = express();

app.use(express.json());
app.use(express.static('public'));

app.use('/api', require('./src/routes/events'));
app.use('/api', require('./src/routes/tickets'));
app.use('/api', require('./src/routes/scan'));
app.use('/api', require('./src/routes/leaderboard'));
app.use('/api', require('./src/routes/resale'));

app.get('/', (req, res) => {
  res.send('Tixken API is running');
  });

  const { startScheduler } = require('./src/agent/scheduler');
  startScheduler();

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Tixken listening on port ${port}`);
    });