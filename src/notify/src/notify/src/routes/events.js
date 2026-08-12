const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { runTransaction } = require('../brickkenClient');
const db = require('../store');
const { sendTelegramAlert } = require('../notify/telegram');

// body: name, tokenSymbol, supplyCap, url, resaleCapPercent, reclaimMode ("burn" or "credit")
router.post('/events', async (req, res) => {
  const { name, tokenSymbol, supplyCap, url, resaleCapPercent, reclaimMode } = req.body;

  if (!/^[A-Z0-9]{2,5}$/.test(tokenSymbol)) {
    return res.status(400).json({ error: 'tokenSymbol must be 2 to 5 uppercase letters or numbers' });
  }

    try {
        const result = await runTransaction('newTokenization', {
              tokenizerEmail: req.body.tokenizerEmail,
                    name,
                          tokenSymbol,
                                tokenType: 'RWA_TOKEN',
                                      supplyCap,
                                            url
                                                });

                                                    const event = {
                                                          id: uuidv4(),
                                                                name,
                                                                      tokenSymbol,
                                                                            supplyCap,
                                                                                  resaleCapPercent: resaleCapPercent || 0,
                                                                                        reclaimMode: reclaimMode || 'burn',
                                                                                              createdAt: new Date().toISOString(),
                                                                                                    txId: result.txId
                                                                                                        };

                                                                                                            db.get('events').push(event).write();
                                                                                                                await sendTelegramAlert(`New event live: ${name} (${tokenSymbol})`);

                                                                                                                    res.json({ event, brickkenResult: result });
                                                                                                                      } catch (err) {
                                                                                                                          res.status(500).json({ error: err.response ? err.response.data : err.message });
                                                                                                                            }
                                                                                                                            });

                                                                                                                            router.get('/events', (req, res) => {
                                                                                                                              res.json(db.get('events').value());
                                                                                                                              });

                                                                                                                              module.exports = router;