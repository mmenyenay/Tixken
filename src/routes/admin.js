const express = require('express');
const router = express.Router();
const { setExecutorAction, approveExecutor } = require('../brickkenClient');

router.get('/setup-rams', async (req, res) => {
  if (req.query.secret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: 'Invalid secret' });
  }

  const tokenSymbol = req.query.tokenSymbol;
  const amount = req.query.amount || '1000000';

  if (!tokenSymbol) {
    return res.status(400).json({ error: 'tokenSymbol query param is required' });
  }

  res.json({ status: 'started', message: 'Running in background, check Railway Deploy Logs for progress, tagged [admin/setup-rams]' });

  (async () => {
    try {
      console.log('[admin/setup-rams] starting transferFrom action setup');
      const result = await setExecutorAction('0x23b872dd', true, 2);
      console.log('[admin/setup-rams] transferFrom action done:', JSON.stringify(result));
    } catch (err) {
      console.error('[admin/setup-rams] transferFrom action failed:', err.response ? JSON.stringify(err.response.data) : err.message);
    }

    try {
      console.log('[admin/setup-rams] starting burnFrom action setup');
      const result = await setExecutorAction('0x79cc6790', true, 1);
      console.log('[admin/setup-rams] burnFrom action done:', JSON.stringify(result));
    } catch (err) {
      console.error('[admin/setup-rams] burnFrom action failed:', err.response ? JSON.stringify(err.response.data) : err.message);
    }

    try {
      console.log('[admin/setup-rams] starting approve for token', tokenSymbol);
      const result = await approveExecutor(tokenSymbol, amount);
      console.log('[admin/setup-rams] approve done:', JSON.stringify(result));
    } catch (err) {
      console.error('[admin/setup-rams] approve failed:', err.response ? JSON.stringify(err.response.data) : err.message);
    }

    console.log('[admin/setup-rams] all steps finished');
  })();
});

module.exports = router;
