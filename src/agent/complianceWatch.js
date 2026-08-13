const { callMcpTool } = require('./mcpClient');
const { runTransaction, getWhitelistStatus } = require('../brickkenClient');
const db = require('../store');
const { sendTelegramAlert } = require('../notify/telegram');

// Runs on a schedule. For every issued ticket, checks whether the wallet we
// have on file still holds it. If it does not, and there was no matching
// resale record, someone moved the ticket outside the app, which means the
// cap check was skipped. The agent then revokes it under its RAMS mandate.
async function checkForUnauthorizedTransfers() {
  const tickets = db.get('tickets').filter({ status: 'issued' }).value();

    for (const ticket of tickets) {
        const event = db.get('events').find({ id: ticket.eventId }).value();

            const status = await getWhitelistStatus(event.tokenSymbol, ticket.attendeeAddress);
                const stillHolds = status && status.balance && Number(status.balance) > 0;

                    if (stillHolds) continue;

                        const canRevoke = await callMcpTool('rams_can_execute', {
                              agentAddress: process.env.AGENT_ADDRESS,
                                    action: 'revoke_noncompliant_transfer'
                                        });

                                            if (!canRevoke || canRevoke.allowed === false) continue;

                                                await callMcpTool('rams_execute', {
                                                      agentAddress: process.env.AGENT_ADDRESS,
                                                            action: 'revoke_noncompliant_transfer',
                                                                  context: { ticketId: ticket.id, eventId: event.id }
                                                                      });

                                                                          await runTransaction('burnToken', {
                                                                                tokenSymbol: event.tokenSymbol,
                                                                                      from: ticket.attendeeAddress,
                                                                                            amount: '1'
                                                                                                });

                                                                                                    db.get('tickets').find({ id: ticket.id }).assign({ status: 'revoked_unauthorized_transfer' }).write();

                                                                                                        await sendTelegramAlert(`Ticket revoked for ${event.name}, transferred outside the cap check`);
                                                                                                          }
                                                                                                          }

                                                                                                          module.exports = { checkForUnauthorizedTransfers };false