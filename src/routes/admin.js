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

  const results = {};

  try {
    results.transferFromAction = await setExecutorAction('0x23b872dd', true, 2);
  } catch (err) {
    results.transferFromAction = { error: err.response ? err.response.data : err.message };
  }

  try {
    results.burnFromAction = await setExecutorAction('0x79cc6790', true, 1);
  } catch (err) {
    results.burnFromAction = { error: err.response ? err.response.data : err.message };
  }

  try {
    results.approve = await approveExecutor(tokenSymbol, amount);
  } catch (err) {
    results.approve = { error: err.response ? err.response.data : err.message };
  }

  res.json(results);
});

module.exports = router;
