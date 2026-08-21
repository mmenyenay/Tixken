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

async function waitForConfirmation(txId, maxAttempts = 75) {
  for (let i = 0; i < maxAttempts; i++) {
    const status = await getTransactionStatus(txId);
    if (status.status === 'success' || status.status === 'confirmed') return status;
    if (status.status === 'failed' || status.status === 'reverted') {
      throw new Error(`Transaction ${txId} failed: ${JSON.stringify(status)}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 4000)); // 75 x 4s = 5 minutes
  }
  throw new Error(`Transaction ${txId} did not confirm in time`);
}

async function mintWithWhitelist(params) {
  const preparePayload = {
    chainId: process.env.CHAIN_ID,
    method: 'mintToken',
    ...params
  };

  const prepareRes = await client.post('/prepare-transactions', preparePayload);
  const { whitelistTx, txIdWhitelist } = prepareRes.data;

  const signedWhitelist = await wallet.signTransaction(whitelistTx);
  await client.post('/send-transactions', {
    txId: txIdWhitelist,
    signedTransactions: [signedWhitelist]
  });
  await waitForConfirmation(txIdWhitelist);

  // Re-prepare the mint step fresh here, rather than reusing the mint
  // transaction from the original prepare call above. That original one
  // can go stale while waiting for the whitelist tx to confirm, since
  // Brickken signs prepared transactions with a 10 minute deadline and
  // confirmation waits can eat into that window.
  const mintOnlyParams = {
    ...params,
    userToMint: params.userToMint.map((u) => ({ ...u, needWhitelist: false }))
  };
  const mintPrepareRes = await client.post('/prepare-transactions', {
    chainId: process.env.CHAIN_ID,
    method: 'mintToken',
    ...mintOnlyParams
  });
  const { transactions, txId } = mintPrepareRes.data;

  const signedMint = await wallet.signTransaction(transactions);
  const sendRes = await client.post('/send-transactions', {
    txId,
    signedTransactions: [signedMint]
  });
  await waitForConfirmation(txId);

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
  const { transactions } = prepareRes.data;
  const txList = Array.isArray(transactions) ? transactions : [transactions];
  return { ...prepareRes.data, transactions: txList };
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

async function whitelistBuyer(tokenSymbol, buyerAddress, buyerEmail) {
  const preparePayload = {
    chainId: 'aa36a7',
    method: 'whitelist',
    signerAddress: process.env.SIGNER_ADDRESS,
    tokenSymbol,
    userToWhitelist: [{
      investorAddress: buyerAddress,
      investorEmail: buyerEmail,
      whitelistStatus: true
    }]
  };

  console.log('[whitelistBuyer] payload:', JSON.stringify(preparePayload));

  const prepareRes = await client.post('/prepare-transactions', preparePayload);
  const { txId, transactions } = prepareRes.data;
  const txList = Array.isArray(transactions) ? transactions : [transactions];

  const signedTransactions = [];
  for (const tx of txList) {
    const signed = await wallet.signTransaction(tx);
    signedTransactions.push(signed);
  }

  await client.post('/send-transactions', { txId, signedTransactions });
  await waitForConfirmation(txId);
}

module.exports = {
  runTransaction,
  waitForConfirmation,
  mintWithWhitelist,
  whitelistBuyer,
  getTransactionStatus,
  getWhitelistStatus,
  getTokenInfo
};

async function setExecutorAction(selector, hasAmount, amountIndex) {
  const signerWallet = new Wallet(process.env.SIGNER_PRIVATE_KEY);
  const prepareRes = await client.post('/x402/rams/set-executor-action', {
    chainId: '11155111',
    signerAddress: process.env.SIGNER_ADDRESS,
    executorAddress: process.env.AGENT_EXECUTOR_ADDRESS,
    selector,
    supported: true,
    hasAmount,
    amountIndex
  });
  const { txId, transactions } = prepareRes.data;
  const txList = Array.isArray(transactions) ? transactions : [transactions];
  const signedTransactions = [];
  for (const tx of txList) {
    signedTransactions.push(await signerWallet.signTransaction(tx));
  }
  await client.post('/send-transactions', { txId, signedTransactions });
  await waitForConfirmation(txId);
  return { txId };
}

async function approveExecutor(tokenSymbol, amount) {
  return runTransaction('approve', {
    signerAddress: process.env.SIGNER_ADDRESS,
    tokenSymbol,
    spenderAddress: process.env.AGENT_EXECUTOR_ADDRESS,
    amount
  });
}

module.exports.setExecutorAction = setExecutorAction;
module.exports.approveExecutor = approveExecutor;

async function ramsExecuteTransfer(tokenAddress, fromAddress, toAddress, amount) {
  const agentWallet = new Wallet(process.env.AGENT_PRIVATE_KEY);
  const preparePayload = {
    chainId: '11155111',
    method: 'ramsExecute',
    signerAddress: process.env.AGENT_ADDRESS,
    executorAddress: process.env.AGENT_EXECUTOR_ADDRESS,
    asset: tokenAddress,
    from: fromAddress,
    to: toAddress,
    amount
  };
  const prepareRes = await client.post('/prepare-transactions', preparePayload);
  const { txId, transactions } = prepareRes.data;
  const txList = Array.isArray(transactions) ? transactions : [transactions];
  const signedTransactions = [];
  for (const tx of txList) {
    signedTransactions.push(await agentWallet.signTransaction(tx));
  }
  await client.post('/send-transactions', { txId, signedTransactions });
  await waitForConfirmation(txId);
}

async function ramsExecuteBurn(tokenAddress, principalAddress, amount) {
  const { utils } = require('ethers');
  const iface = new utils.Interface(['function burnFrom(address,uint256)']);
  const data = iface.encodeFunctionData('burnFrom', [principalAddress, amount]);

  const agentWallet = new Wallet(process.env.AGENT_PRIVATE_KEY);
  const preparePayload = {
    chainId: '11155111',
    method: 'ramsExecute',
    signerAddress: process.env.AGENT_ADDRESS,
    executorAddress: process.env.AGENT_EXECUTOR_ADDRESS,
    target: tokenAddress,
    data
  };
  const prepareRes = await client.post('/prepare-transactions', preparePayload);
  const { txId, transactions } = prepareRes.data;
  const txList = Array.isArray(transactions) ? transactions : [transactions];
  const signedTransactions = [];
  for (const tx of txList) {
    signedTransactions.push(await agentWallet.signTransaction(tx));
  }
  await client.post('/send-transactions', { txId, signedTransactions });
  await waitForConfirmation(txId);
}

module.exports.ramsExecuteTransfer = ramsExecuteTransfer;
module.exports.ramsExecuteBurn = ramsExecuteBurn;

async function waitForWhitelistStatus(tokenSymbol, address, maxAttempts = 10, delayMs = 3000) {
  for (let i = 0; i < maxAttempts; i++) {
    const status = await getWhitelistStatus(tokenSymbol, address);
    if (status && status.isWhitelisted) return status;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  throw new Error('Whitelist status did not confirm for ' + address + ' after ' + maxAttempts + ' attempts');
}

module.exports.waitForWhitelistStatus = waitForWhitelistStatus;
