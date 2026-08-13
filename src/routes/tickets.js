const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const { mintWithWhitelist } = require('../brickkenClient');
const db = require('../store');
const { sendEmail } = require('../notify/email');

router.post('/tickets', async (req, res) => {
  const { eventId, attendeeAddress, attendeeEmail } = req.body;
  const event = db.get('events').find({ id: eventId }).value();

  if (!event) return res.status(404).json({ error: 'Event not found' });

  try {
    const mintResult = await mintWithWhitelist({
      tokenSymbol: event.tokenSymbol,
      signerAddress: process.env.SIGNER_ADDRESS,
      userToMint: [
        {
          investorEmail: attendeeEmail,
          investorAddress: attendeeAddress,
          amount: '1',
          needWhitelist: true
        }
      ]
    });

    const ticketId = uuidv4();
    const qrPayload = JSON.stringify({ ticketId, eventId, attendeeAddress });
    const qrDataUrl = await QRCode.toDataURL(qrPayload);

    const ticket = {
      id: ticketId,
      eventId,
      attendeeAddress,
      attendeeEmail,
      status: 'issued',
      issuedAt: new Date().toISOString(),
      txId: mintResult.txId
    };

    db.get('tickets').push(ticket).write();

    if (attendeeEmail) {
      await sendEmail(
        attendeeEmail,
        `Your ticket for ${event.name}`,
        `<p>Here is your ticket. Show this QR code at the door.</p><img src="${qrDataUrl}" />`
      );
    }

    res.json({ ticket, qrDataUrl });
  } catch (err) {
    res.status(500).json({ error: err.response ? err.response.data : err.message });
  }
});

module.exports = router;