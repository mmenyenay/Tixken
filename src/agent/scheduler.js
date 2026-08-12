const cron = require('node-cron');
const { reclaimExpiredTickets } = require('./reclaimJob');
const { checkForUnauthorizedTransfers } = require('../routes/src/agent/complianceWatch');

function startScheduler() {
  cron.schedule('0 * * * *', async () => {
    console.log('Running reclaim check');
    await reclaimExpiredTickets();
  });

  cron.schedule('*/15 * * * *', async () => {
    console.log('Running compliance check');
    await checkForUnauthorizedTransfers();
  });
}

module.exports = { startScheduler };