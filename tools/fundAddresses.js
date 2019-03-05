const hdkey = require('ethereumjs-wallet/hdkey');
const bip39 = require("bip39");
const JSBI = require('jsbi');
const fetch = require('node-fetch');
const poorManRpc = require('./poorManRpc');
const fs = require('fs');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const { Tx, helpers, Output, Outpoint } = require('leap-core');

const mnemonic = 'drum brave under memory hold section bike fantasy either multiply brand coach';
const nodeUrl = "http://node1.testnet.leapdao.org:8645";
const walletHdpath = "m/44'/60'/0'/0/";
const addrNum = 100;
const hdwallet = hdkey.fromMasterSeed(bip39.mnemonicToSeed(mnemonic));
const rpc = poorManRpc(fetch, nodeUrl);

const getAddressData = (index) => {
    const wallet = hdwallet.derivePath(walletHdpath + index).getWallet();
    const addr = '0x' + wallet.getAddress().toString('hex');
    const priv = wallet.getPrivateKeyString();

    return {address: addr, priv: priv};
}

const getBalance = async(address) => {
    const response = await rpc("plasma_unspent", [address]);
    const balance = response.reduce((sum, unspent) => { 
        return (unspent.output.color === 0) ? JSBI.add(sum, JSBI.BigInt(unspent.output.value)) : sum}, JSBI.BigInt(0));

    return balance;
}

const sendFunds = async(from, to, amount) => {
    const utxos = (await rpc("plasma_unspent", [from.address]))
    .map(u => ({
      output: u.output,
      outpoint: Outpoint.fromRaw(u.outpoint),
    }));

    if (utxos.length === 0) {
        throw new Error("No tokens left in the funder wallet");
    }

    const inputs = helpers.calcInputs(utxos, from.address, amount, 0);

    // create change output if needed
    let outputs = helpers.calcOutputs(utxos, inputs, from.address, to, amount, 0);
    /*if (outputs.length > 1) { // if we have change output
        outputs = outputs.splice(-1); // leave only change
    } else {
        outputs = [];
    }

    outputs.push(new Output(amount, to, 0));*/
    
    /*console.log(inputs);
    console.log('-------------');
    console.log(outputs);*/

    const tx = Tx.transfer(inputs, outputs).signAll(from.priv);

    // eslint-disable-next-line no-console
    await rpc("eth_sendRawTransaction", [tx.hex()]);
}

async function run() {
    const from = getAddressData(0);
    console.log(`Funder address: ${from.address}`);
    let balance = await getBalance(from.address);
    console.log(`Funder balance: ${String(balance)}`);
    let share;
    if(JSBI.GE(balance,JSBI.BigInt(addrNum))) {
        share = JSBI.divide(balance, JSBI.BigInt(addrNum));
    } else {
        throw new Error(`Not enough funds (${String(balance)}) on address: ${from.addr}`);
    }
    console.log(`Will distribute among ${addrNum} wallets each will get: ${String(share)}`);

    let addresses = [];
    let currAddr;

    for(let i = 1; i<=addrNum; i++) {
        currAddr = getAddressData(i);
        console.log(`Sending to address: ${currAddr.address}`);
        await sendFunds(from, currAddr.address, String(share));
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