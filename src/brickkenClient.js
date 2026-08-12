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

              const wallet = new Wallet(process.env.SIGNER_PRIVATE_KEY);

              // Prepares a transaction, signs every returned tx with our wallet, then sends it.
              // This is the same prepare, sign, send flow the docs describe.
              async function runTransaction(method, params) {
                const preparePayload = {
                    chainId: process.env.CHAIN_ID,
                        method,
                            signerAddress: process.env.SIGNER_ADDRESS,
                                ...params
                                  };

                                    const prepareRes = await client.post('/prepare-transactions', preparePayload);
                                      const { txId, transactions } = prepareRes.data;

                                        const signedTransactions = [];
                                          for (const tx of transactions) {
                                              const signed = await wallet.signTransaction(tx);
                                                  signedTransactions.push(signed);
                                                    }

                                                      const sendRes = await client.post('/send-transactions', {
                                                          txId,
                                                              signedTransactions
                                                                });

                                                                  return sendRes.data;
                                                                  }

                                                                  runTransaction.prepareOnly = async function (method, params) {
                                                                    const preparePayload = {
                                                                      chainId: process.env.CHAIN_ID,
                                                                      method,
                                                                      executionMode: 'client-broadcast',
                                                                      ...params
                                                                    };
                                                                    const prepareRes = await client.post('/prepare-transactions', preparePayload);
                                                                    return prepareRes.data;
                                                                  };

                                                                  runTransaction.confirmOnly = async function ({ txId, txHash }) {
                                                                    const sendRes = await client.post('/send-transactions', { txId, txHash });
                                                                    return sendRes.data;
                                                                  };

                                                                  async function getTransactionStatus(txId) {
                                                                    const res = await client.get('/get-transaction-status', { params: { txId } });
                                                                      return res.data;
                                                                      }

                                                                      async function getWhitelistStatus(tokenSymbol, address) {
                                                                        const res = await client.get('/get-whitelist-status', {
                                                                            params: { tokenSymbol, address }
                                                                              });
                                                                                return res.data;
                                                                                }

                                                                                async function getTokenInfo(tokenSymbol) {
                                                                                  const res = await client.get('/get-token-info', { params: { tokenSymbol } });
                                                                                    return res.data;
                                                                                    }

                                                                                    module.exports = {
                                                                                      runTransaction,
                                                                                        getTransactionStatus,
                                                                                          getWhitelistStatus,
                                                                                            getTokenInfo
                                                                                            };