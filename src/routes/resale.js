const express = require('express');
const router = express.Router();
const { runTransaction, getWhitelistStatus, whitelistBuyer } = require('../brickkenClient');
const db = require('../store');
const { sendTelegramAlert } = require('../notify/telegram');

// Seller lists a ticket for resale. We check the cap here, before anything
// touches the chain, so a rejected listing never costs a prepare call.
router.post('/resale/list', (req, res) => {
  const { ticketId, sellerAddress, price } = req.body;
    const ticket = db.get('tickets').find({ id: ticketId }).value();

      if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
        if ((ticket.attendeeAddress || '').toLowerCase() !== (sellerAddress || '').toLowerCase()) {
            return res.status(403).json({ error: 'Only the current holder can list this ticket' });
              }

                const event = db.get('events').find({ id: ticket.eventId }).value();
                  const originalPrice = event.originalPrice || 0;
                    const cap = originalPrice * (1 + (event.resaleCapPercent || 0) / 100);

                      if (originalPrice > 0 && price > cap) {
                          return res.status(400).json({ error: `Price exceeds resale cap of ${cap}` });
                            }

                              db.get('tickets').find({ id: ticketId }).assign({
                                  resaleListing: { price, listedAt: new Date().toISOString() }
                                    }).write();

                                      res.json({ status: 'listed', price, cap });
                                      });

                                      // Step one of the buy flow. Prepares the transfer for the seller's wallet
                                      // to sign, does not touch the chain yet.
                                      router.post('/resale/prepare-transfer', async (req, res) => {
                                        const { ticketId, buyerAddress, buyerEmail } = req.body;
                                          const ticket = db.get('tickets').find({ id: ticketId }).value();

                                            if (!ticket || !ticket.resaleListing) {
                                                return res.status(400).json({ error: 'Ticket is not listed for resale' });
                                                  }

                                                    const event = db.get('events').find({ id: ticket.eventId }).value();

                                                      try {
                                                          console.log('[resale] whitelisting buyer before transfer:', buyerAddress); await whitelistBuyer(event.tokenSymbol, buyerAddress, buyerEmail);

    const prepareResult = await runTransaction.prepareOnly('transferTo', {
                                                                tokenSymbol: event.tokenSymbol,
      signerAddress: ticket.attendeeAddress,
                                                                      to: buyerAddress,
                                                                            amount: '1'
                                                                                      });

                                                                                          res.json(prepareResult);
                                                                                            } catch (err) {
                                                                                                res.status(500).json({ error: err.response ? err.response.data : err.message });
                                                                                                  }
                                                                                                  });

                                                                                                  // Step two. Seller's wallet has signed the prepared transaction client side,
                                                                                                  // this forwards it and updates our records.
                                                                                                  router.post('/resale/send-transfer', async (req, res) => {
                                                                                                    const { ticketId, buyerAddress, buyerEmail, txId, txHash } = req.body;
                                                                                                      const ticket = db.get('tickets').find({ id: ticketId }).value();
                                                                                                        const event = db.get('events').find({ id: ticket.eventId }).value();

                                                                                                          try {
                                                                                                              const confirmResult = await runTransaction.confirmOnly({ txId, txHash });

                                                                                                                  const soldPrice = ticket.resaleListing.price;

                                                                                                                  db.get('tickets').find({ id: ticketId }).assign({
                                                                                                                        attendeeAddress: buyerAddress,
                                                                                                                              attendeeEmail: buyerEmail,
                                                                                                                                    resaleListing: null
                                                                                                                                        }).write();

                                                                                                                                            await sendTelegramAlert(`Ticket resold for ${event.name} at ${soldPrice}`);

                                                                                                                                                res.json({ status: 'transferred', confirmResult });
                                                                                                                                                  } catch (err) {
                                                                                                                                                      res.status(500).json({ error: err.response ? err.response.data : err.message });
                                                                                                                                                        }
                                                                                                                                                        });

                                                                                                                                                        module.exports = router;
