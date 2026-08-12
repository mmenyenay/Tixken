const express = require('express');
const router = express.Router();
const { runTransaction } = require('../brickkenClient');
const db = require('../store');
const { sendTelegramAlert } = require('../notify/telegram');

// body: ticketId
router.post('/scan', async (req, res) => {
  const { ticketId } = req.body;
    const ticket = db.get('tickets').find({ id: ticketId }).value();

      if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
        if (ticket.status !== 'issued') {
            return res.status(400).json({ error: `Ticket already ${ticket.status}` });
              }

                const event = db.get('events').find({ id: ticket.eventId }).value();

                  try {
                      const burnResult = await runTransaction('burnToken', {
                            tokenSymbol: event.tokenSymbol,
                                  amount: '1',
                                        investorEmail: ticket.attendeeEmail
                                            });

                                                db.get('tickets')
                                                      .find({ id: ticketId })
                                                            .assign({ status: 'used', usedAt: new Date().toISOString(), burnTxId: burnResult.txId })
                                                                  .write();

                                                                      db.get('leaderboard')
                                                                            .push({ attendeeAddress: ticket.attendeeAddress, eventId: event.id, attendedAt: new Date().toISOString() })
                                                                                  .write();

                                                                                      await sendTelegramAlert(`Entry confirmed for ${event.name}`);

                                                                                          res.json({ status: 'entry confirmed', burnResult });
                                                                                            } catch (err) {
                                                                                                res.status(500).json({ error: err.response ? err.response.data : err.message });
                                                                                                  }
                                                                                                  });

                                                                                                  module.exports = router;