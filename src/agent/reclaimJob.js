const { runTransaction, getTokenInfo, ramsExecuteTransfer, ramsExecuteBurn } = require('../brickkenClient');
const db = require('../store');
const { sendTelegramAlert } = require('../notify/telegram');
const { sendEmail } = require('../notify/email');

// RAMS mandate is now set up (transferFrom and burnFrom selectors registered,
// executor approved). Reclaim now routes through the delegated executor
// instead of calling the Dapp API directly with SIGNER_ADDRESS.

async function getTokenContractAddress(tokenSymbol) {
  const info = await getTokenInfo(tokenSymbol);
  const address = info.tokenAddress || info.contractAddress || info.address || (info.token && info.token.address);
  if (!address) {
    throw new Error('Could not find token contract address in getTokenInfo response for ' + tokenSymbol + ': ' + JSON.stringify(info));
  }
  return address;
}

function toRawAmount(amount, decimals) {
  const dec = decimals === undefined || decimals === null ? 18 : Number(decimals);
  return (BigInt(amount) * (10n ** BigInt(dec))).toString();
}

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
        const tokenInfo = await getTokenInfo(event.tokenSymbol);
        const tokenAddress = tokenInfo.tokenAddress || tokenInfo.contractAddress || tokenInfo.address || (tokenInfo.token && tokenInfo.token.address);
        if (!tokenAddress) {
          throw new Error('Could not find token contract address in getTokenInfo response: ' + JSON.stringify(tokenInfo));
        }
        const decimals = tokenInfo.decimals !== undefined ? tokenInfo.decimals : 18;
        const rawAmount = toRawAmount('1', decimals);
        console.log(`[reclaimJob] using tokenAddress ${tokenAddress}, decimals ${decimals}, rawAmount ${rawAmount} for ticket ${ticket.id}`);

        if (event.reclaimMode === 'credit') {
          await ramsExecuteTransfer(tokenAddress, ticket.attendeeAddress, process.env.SIGNER_ADDRESS, rawAmount);

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
          await ramsExecuteBurn(tokenAddress, ticket.attendeeAddress, rawAmount);

          db.get('tickets').find({ id: ticket.id }).assign({ status: 'reclaimed_burned' }).write();
        }

        await sendTelegramAlert(`Reclaimed unused ticket for ${event.name}, mode: ${event.reclaimMode}, via RAMS mandate`);

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
        console.error(`[reclaimJob] failed to reclaim ticket ${ticket.id}:`, err.response ? JSON.stringify(err.response.data) : err.message);
      }
    }
  }
}

module.exports = { reclaimExpiredTickets };
