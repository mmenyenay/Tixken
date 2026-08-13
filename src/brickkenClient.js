const axios = require('axios');
const { Wallet } = require('ethers');
require('dotenv').config();

const client = axios.create({
  baseURL: process.env.BRICKKEN_API_BASE,
  timeout: 20000,
  headers: {
    'x-api-key': process.env.BRICKKEN_API_KEY,
    'Content-Type': 'application/json'
  }
});

const wallet = new Wallet(process.env.SIGNER_PRIVATE_KEY);

async function runTransaction(method, params) {
  const preparePayload = {
    chainId: process.env.CHAIN_ID,
    method,
    ...params
  };

  const prepareRes = await client.post('/prepare-transactions', preparePayload);
  const { txId, transactions } = prepareRes.data;

  const txList = Array.isArray(transactions) ? transactions : [transactions];

  const signedTransactions = [];
  for (const tx of txList) {
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
