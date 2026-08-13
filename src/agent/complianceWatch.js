const { runTransaction, getWhitelistStatus } = require('../brickkenClient');
const db = require('../store');
const { sendTelegramAlert } = require('../notify/telegram');

// Same note as reclaimJob, this revokes directly rather than through a
// RAMS mandate for now, that layer is pending sandbox role setup.
async function checkForUnauthorizedTransfers() {
  const tickets = db.get('tickets').filter({ status: 'issued' }).value();

  for (const ticket of tickets) {
    const event = db.get('events').find({ id: ticket.eventId }).value();

    const status = await getWhitelistStatus(event.tokenSymbol, ticket.attendeeAddress);
    const stillHolds = status && status.balance && Number(status.balance) > 0;

    if (stillHolds) continue;

    await runTransaction('burnToken', {
      tokenSymbol: event.tokenSymbol,
      amount: '1',
      investorEmail: ticket.attendeeEmail
    });

    db.get('tickets').find({ id: ticket.id }).assign({ status: 'revoked_unauthorized_transfer' }).write();

    await sendTelegramAlert(`Ticket revoked for ${event.name}, transferred outside the cap check`);
  }
}

module.exports = { checkForUnauthorizedTransfers };