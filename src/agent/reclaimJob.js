const { runTransaction } = require('../brickkenClient');
const db = require('../store');
const { sendTelegramAlert } = require('../notify/telegram');
const { sendEmail } = require('../notify/email');

// RAMS mandate gating is not wired in yet, pending Brickken's answer on
// ComplianceProvider ownership for the sandbox. For now this runs the
// reclaim directly through the Dapp API, still real, still verifiable,
// just without the delegated agent authority layer on top.
async function reclaimExpiredTickets() {
  const now = new Date();
  const events = db.get('events').value();

  for (const event of events) {
    if (!event.endsAt || new Date(event.endsAt) > now) continue;

    const expiredTickets = db.get('tickets')
      .filter({ eventId: event.id, status: 'issued' })
      .value();

    for (const ticket of expiredTickets) {
      try {
        if (event.reclaimMode === 'credit') {
          await runTransaction('transferFrom', {
            tokenSymbol: event.tokenSymbol,
            signerAddress: process.env.SIGNER_ADDRESS,
            from: ticket.attendeeAddress,
            to: process.env.SIGNER_ADDRESS,
            amount: '1'
          });

          await runTransaction('mintToken', {
            tokenSymbol: process.env.CREDIT_TOKEN_SYMBOL,
            signerAddress: process.env.SIGNER_ADDRESS,
            userToMint: [
              {
                investorEmail: ticket.attendeeEmail,
                investorAddress: ticket.attendeeAddress,
                amount: '1',
                needWhitelist: true
              }
            ]
          });

          db.get('tickets').find({ id: ticket.id }).assign({ status: 'converted_to_credit' }).write();
        } else {
          await runTransaction('burnToken', {
            tokenSymbol: event.tokenSymbol,
            signerAddress: process.env.SIGNER_ADDRESS,
            amount: '1',
            investorEmail: ticket.attendeeEmail
          });

          db.get('tickets').find({ id: ticket.id }).assign({ status: 'reclaimed_burned' }).write();
        }

        await sendTelegramAlert(`Reclaimed unused ticket for ${event.name}, mode: ${event.reclaimMode}`);

        if (ticket.attendeeEmail) {
          await sendEmail(
            ticket.attendeeEmail,
            `Your ticket for ${event.name} expired`,
            event.reclaimMode === 'credit'
              ? '<p>You did not make it to the event. Your ticket was converted into a credit for the next one.</p>'
              : '<p>Your unused ticket has been closed out.</p>'
          );
        }
      } catch (err) {
        console.error(`Failed to reclaim ticket ${ticket.id}:`, err.message);
      }
    }
  }
}

module.exports = { reclaimExpiredTickets };
