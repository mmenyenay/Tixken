const axios = require('axios');
const { Wallet } = require('ethers');
require('dotenv').config();

const client = axios.create({
      baseURL: process.env.BRICKKEN_API_BASE,
        headers: {
                'x-api-key': process.env.BRICKKEN_API_KEY,
                    'Content-Type': 'application/json'
        }
});

const agentWallet = new Wallet(process.env.AGENT_PRIVATE_KEY);

async function registerAgent() {
      const prepareRes = await client.post('/x402/agent/register', {
            chainId: process.env.AGENT_CHAIN_ID,
                executionMode: 'client-signed',
                    signerAddress: process.env.AGENT_ADDRESS,
                        name: 'Tixken Reclaim Agent',
                            description: 'Reclaims unused event tickets after the deadline, burns or converts them to a credit, and revokes ticket transfers that skip the resale price cap.',
                                image: process.env.AGENT_IMAGE_URL,
                                    services: [
                                              {
                                                        name: 'reclaim-service',
                                                                endpoint: `${process.env.BASE_URL}/api`
                                              }
                                    ],
                                        aiModelName: 'none',
                                            aiModelProvider: 'rule-based',
                                                x402Support: false,
                                                    active: true
      });

        const { txId, transactions, info } = prepareRes.data;
          const txList = Array.isArray(transactions) ? transactions : [transactions];

            const signedTransactions = [];
              for (const tx of txList) {
                    const signed = await agentWallet.signTransaction(tx);
                        signedTransactions.push(signed);
              }

                const sendRes = await client.post('/send-transactions', {
                        txId,
                            signedTransactions
                });

                  console.log('Agent registered. Save this agentUuid:', info?.agentUuid);
                    console.log('Send result:', sendRes.data);
}

registerAgent().catch((err) => {
      console.error('Registration failed:', err.response ? err.response.data : err.message);
});
})
                })
              }
                                              }
                                    ]
      })
}
        }
})