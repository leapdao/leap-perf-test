const { helpers, Tx, Outpoint } = require('leap-core');

function formatHostname(hostname, port) {
  return 'http://'+hostname+':'+port;
}

function unspentForAddress(unspent, address, color) {
  return Object.keys(unspent)
    .filter(
      k =>
        unspent[k] &&
        unspent[k].address.toLowerCase() === address.toLowerCase() &&
        (color !== undefined ? unspent[k].color === color : true)
    )
    .map(k => ({
      outpoint: k,
      output: unspent[k],
    }))
    .sort((a, b) => {
      return a.output.value - b.output.value;
    });
};

function makeTransfer(context, ee, next) {
  let unspents = context.vars['unspents'];
  let from = context.vars['from'];
  let to = context.vars['to'];
  let amount = context.vars['amount'];
  let color = context.vars['color'];
  let privKey = context.vars['privKey'];

  let fromAddr = from.toLowerCase();
  to = to.toLowerCase();

  const utxos = unspents.map(u => ({
    output: u.output,
    outpoint: Outpoint.fromRaw(u.outpoint),
  }));

  const inputs = helpers.calcInputs(utxos, from, amount, color);
  const outputs = helpers.calcOutputs(
    utxos,
    inputs,
    fromAddr,
    to,
    amount,
    color
  );
  const trans = Tx.transfer(inputs, outputs).signAll(privKey);
  context.vars['transfer'] = trans;
  context.vars['transferHex'] = trans.hex();

  return next();
}

module.exports = { formatHostname, unspentForAddress, makeTransfer };