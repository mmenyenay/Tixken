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
    const mintParams = {
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
    };
    console.log('[tickets] mintWithWhitelist params:', JSON.stringify(mintParams));
    const mintResult = await mintWithWhitelist(mintParams);

    // getTokenInfo does not return the token's own contract address, so we
    // capture it here from the mint transaction itself, which targets the
    // token contract directly.
    let tokenAddress;
    let txHash;
    try {
      const txResponse = mintResult.results[0].result.txResponses[0];
      tokenAddress = txResponse.to;
      txHash = txResponse.hash;
      console.log('[tickets] captured tokenAddress from mint response:', tokenAddress);
    } catch (e) {
      console.error('[tickets] could not extract tokenAddress from mint response:', JSON.stringify(mintResult));
    }

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
      tokenAddress,
      txHash
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
