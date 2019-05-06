const hdkey = require('ethereumjs-wallet/hdkey');
const bip39 = require("bip39");
const JSBI = require('jsbi');
const fetch = require('node-fetch');
const Web3 = require('web3');
const fs = require('fs');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const Tx = require('ethereumjs-tx');
const erc20abi = require('./abis/erc20abi');
//const { Tx, helpers, Output, Outpoint } = require('leap-core');

const mnemonic = 'drum brave under memory hold section bike fantasy either multiply brand coach';
const ethUrl = 'https://rinkeby.infura.io/v3/7c3756f0838243768758b015883930f3';
const walletHdpath = "m/44'/60'/0'/0/";
const addrNum = 100;
const hdwallet = hdkey.fromMasterSeed(bip39.mnemonicToSeed(mnemonic));
const web3 = new Web3(ethUrl);
const tokenAddr = '0xD2D0F8a6ADfF16C2098101087f9548465EC96C98';
const token = new web3.eth.Contract(erc20abi, tokenAddr);
const exitHandlerAddr = '0x2c2a3b359edbCFE3c3Ac0cD9f9F1349A96C02530';
const ethForGas = web3.util.toWei(0.01, 'ether');

const getAddressData = (index) => {
    const wallet = hdwallet.derivePath(walletHdpath + index).getWallet();
    const addr = '0x' + wallet.getAddress().toString('hex');
    const priv = wallet.getPrivateKeyString();

    return {address: addr, priv: priv};
}

const getBalance = async(address) => {
    const balance = await web3.eth.getBalance(address).toNumber();

    return balance;
}

const sendRawTx = async(txData, priv) => {
    const tx = new Tx(txData);
    tx.sign(from.priv);
    const serializedTx = tx.serialize();
    const rawTx = '0x' + serializedTx.toString('hex');
    web3.eth.sendSignedTransaction(rawTx, (err, txHash) => {
        console.log('txHash:', txHash)
    });
}

const sendEth = async(from, to, amount) => {
    const txCount = await web3.eth.getTransactionCount(from.addr);
    const txData = {
        nonce:    web3.utils.toHex(txCount),
        to:       to,
        value:    web3.utils.toHex(amount),
        gasLimit: web3.utils.toHex(21000),
        gasPrice: web3.utils.toHex(web3.utils.toWei('10', 'gwei'))
    }
    
    await sendRawTx(txData, from.priv);
}

const sendTokens = async(from, to, amount) => {
    const txCount = await web3.eth.getTransactionCount(from.addr);

    const txData = {
        nonce:    web3.utils.toHex(txCount),
        gasLimit: web3.utils.toHex(800000),
        gasPrice: web3.utils.toHex(web3.utils.toWei('10', 'gwei')),
        to:       to,
        data:     token.methods.transfer(currAddr.address, amount).encodeABI()
    }

    await sendRawTx(txData, from.priv);
}

const approveDeposit = async(from, amount) => {
    const txCount = await web3.eth.getTransactionCount(from.addr);

    const txData = {
        nonce:    web3.utils.toHex(txCount),
        gasLimit: web3.utils.toHex(800000),
        gasPrice: web3.utils.toHex(web3.utils.toWei('10', 'gwei')),
        to:       to,
        data:     token.methods.approve(exitHandlerAddr, amount).encodeABI()
    }

    await sendRawTx(txData, from.priv);
}

async function run() {
    const from = getAddressData(0);
    console.log(`Funder address: ${from.address}`);
    const ethBalance = await web3.eth.getBalance(from.address).toNumber();
    console.log(`Funder ETH balance: ${ethBalance}`);
    if(ethBalance < addrNum * ethForGas) {
        throw new Error(`Not enough ether (${balance}) on address: ${from.addr}`);
    }
    let balance = (await token.methods.balanceOf(from.address).call()) * 1;
    console.log(`Funder token balance: ${balance}`);
    if(balance >= addrNum) {
        const share = Math.floor(balance / addrNum);
    } else {
        throw new Error(`Not enough tokens (${balance}) on address: ${from.addr}`);
    }
    console.log(`Will distribute among ${addrNum} wallets each will get: ${String(share)}`);

    let addresses = [];
    let currAddr;

    for(let i = 1; i<=addrNum; i++) {
        currAddr = getAddressData(i);
        console.log(`Funding address ${currAddr.address}`);
        console.log('ETH for gas...');
        await sendEth(from, currAddr.address, ethForGas);
        console.log('Tokens on mainnet...');
        await sendTokens(from, currAddr.address, share);
        console.log('Approval for deposit...');
        await approveDeposit(currAddr, share);
        addresses.push(currAddr);
    }

    console.log('Writing to wallets data to CSV file');
    const csvWriter = createCsvWriter({  
        path: './out.csv',
        header: [
        {id: 'address', title: 'Address'},
        {id: 'priv', title: 'Private_Key'},
        ]
    });

    csvWriter  
        .writeRecords(addresses)
        .then(()=> console.log('The CSV file was written successfully'));
}

run();