const { callMcpTool } = require('./mcpClient');
require('dotenv').config();

// One time setup. Registers the ERC-8004 agent identity, then grants it a
// RAMS mandate scoped only to the reclaim action, with a cap on how many
// tickets it can touch per run. Check the Postman collection for the exact
// field names your account version expects, this follows the documented
// tool names but Brickken may adjust required fields per release.
async function setupAgent() {
  const registerResult = await callMcpTool('agent_register', {
      ownerAddress: process.env.SIGNER_ADDRESS,
          metadataUri: process.env.AGENT_METADATA_URI || ''
            });
              console.log('Agent registered:', registerResult);

                const mandateResult = await callMcpTool('rams_grant_mandate', {
                    agentAddress: process.env.AGENT_ADDRESS,
                        principalAddress: process.env.SIGNER_ADDRESS,
                            scope: 'reclaim_unused_tickets',
                                expiresAt: process.env.MANDATE_EXPIRY
                                  });
                                    console.log('Mandate granted:', mandateResult);

                                      const actionResult = await callMcpTool('rams_set_executor_action', {
                                          agentAddress: process.env.AGENT_ADDRESS,
                                              action: 'reclaim_unused_tickets',
                                                  maxCallsPerPeriod: 500
                                                    });
                                                      console.log('Executor action set:', actionResult);
                                                      }

                                                      setupAgent().catch((err) => console.error('Setup failed:', err));