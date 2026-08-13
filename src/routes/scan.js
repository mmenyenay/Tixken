const express = require('express');
const router = express.Router();
const { runTransaction } = require('../brickkenClient');
const db = require('../store');
const { sendTelegramAlert } = require('../notify/telegram');

// Step one, prepares the burn for the ticket holder's own wallet to sign.
router.post('/scan/prepare', async (req, res) => {
  const { ticketId } = req.body;
  const ticket = db.get('tickets').find({ id: ticketId }).value();

  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  if (ticket.status !== 'issued') {
    return res.status(400).json({ error: `Ticket already ${ticket.status}` });
  }

  const event = db.get('events').find({ id: ticket.eventId }).value();

  try {
    const prepared = await runTransaction.prepareOnly('burnToken', {
      tokenSymbol: event.tokenSymbol,
      signerAddress: ticket.attendeeAddress,
      amount: '1',
      investorEmail: ticket.attendeeEmail
    });

    res.json(prepared);
  } catch (err) {
    res.status(500).json({ error: err.response ? err.response.data : err.message });
  }
});

// Step two, forwards the signed burn once the attendee's wallet confirms it.
router.post('/scan/confirm', async (req, res) => {
  const { ticketId, txId, txHash } = req.body;
  const ticket = db.get('tickets').find({ id: ticketId }).value();
  const event = db.get('events').find({ id: ticket.eventId }).value();

  try {
    const confirmResult = await runTransaction.confirmOnly({ txId, txHash });

    db.get('tickets')
      .find({ id: ticketId })
      .assign({ status: 'used', usedAt: new Date().toISOString() })
      .write();

    db.get('leaderboard')
      .push({ attendeeAddress: ticket.attendeeAddress, eventId: event.id, attendedAt: new Date().toISOString() })
      .write();

    await sendTelegramAlert(`Entry confirmed for ${event.name}`);

    res.json({ status: 'entry confirmed', confirmResult });
  } catch (err) {
    res.status(500).json({ error: err.response ? err.response.data : err.message });
  }
});

module.exports = router;
