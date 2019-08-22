const Contract = require('../../contracts');
const CommitReveal = require('./CommitReveal');
const gameInit = require('./gameInit');
const db = require('../db');

var checkBetErrorTimer = 0;
var currentPrivateKey = process.env.PRIVATE_KEY;

var stop = false;
function betToString(bet) {
  return `${bet.index}: ${bet.player} | ${bet.round} | ${bet.number >= 10 ? bet.number : '0' + bet.number} | ${bet.isOver ? 'Over ' : 'Under'} | ${bet.amount}`;
}

async function getBetForSettle(index) {
  try {
    var bet = await Contract.get.bet(index);
    return bet
  } catch (ex) {
    var msg = ex.toString();
    if (msg.indexOf('Invalid JSON RPC') >= 0) {
      console.error(ex.toString());
    }
  }

  return null;
}

async function settle(index, cb) {
  try {
    if (stop) return;

    var bet = await getBetForSettle(index);
    if (bet) {
      await db.set(`LAST_BET_SETTLE_${Contract.config.ADDRESS}`, index);
    }
    else {
      return settle(index, cb);
    }

    settle(index + 1, cb);

    if (!bet.isFinished) {
      try {
        await callSettle(bet, index);
      }
      catch (ex) {
        console.log('[Error] Settle error bet:', bet.index);
        await db.addBetError(bet.index);
        cb && cb(ex)
      }
    }
  }
  catch (ex) {
    cb && cb(ex);
  }
}

async function checkBetErrorAndTrySettleAgain(cb) {
  clearTimeout(checkBetErrorTimer);
  if (stop) return;

  try {
    var index = await db.getIndexOfBetError();
    if (!index) {
      checkBetErrorTimer = setTimeout(() => {
        checkBetErrorAndTrySettleAgain(cb)
      }, 5000);
      return ;
    }
    try {
      var bet = await getBetForSettle(index);
      if (bet.isFinished) {
        await db.removeBetError(index);
      }
      else {
        console.log('TRY SETTLE AGAIN BET:', index);
        await callSettle(bet);
        await db.removeBetError(index);
      }
    }
    catch (ex) {
      console.log('[Error] Try settle bet again:', index);
      cb && cb(ex)
    }
    return checkBetErrorAndTrySettleAgain(cb);
  }
  catch (ex) {
    cb && cb(ex);
    checkBetErrorTimer = setTimeout(() => {
      checkBetErrorAndTrySettleAgain(cb)
    }, 5000);
  }
}

async function callSettle(bet) {
  if (bet) {
    var secret = await CommitReveal.getSecretForBet(bet);
    var commitment = await CommitReveal.generateCommitment();
    var hash = await Contract.settleBet(bet.index, secret, commitment);
    await Contract.get.checkTx(hash);
    console.log(betToString(bet), ' > ', hash);
  }
}

module.exports = {
  start: (shouldChangePrivateKey, callback) => {
    stop = false;
    if (shouldChangePrivateKey && !isNaN(parseInt(currentPrivateKey))) {
      var nextPK = parseInt(currentPrivateKey) + 1;
      nextPK = nextPK % 5;
      currentPrivateKey = process.env[`PK${nextPK}`]
    }
    Contract.login({
      privateKey: process.env[`PK${currentPrivateKey}`] || currentPrivateKey
    }, async (err, address) => {
      if (err) return callback && callback(err);

      console.log('Connect wallet:', address);
      try {
        await gameInit();
        var betIndex = 1;
        try {
          betIndex = await db.get(`LAST_BET_SETTLE_${Contract.config.ADDRESS}`);
          betIndex = parseInt(betIndex);
        }
        catch (ex) {
        }
        console.log('Settle from bet:', betIndex);
        await db.set(`LAST_BET_SETTLE_${Contract.config.ADDRESS}`, betIndex);
        settle(betIndex, callback);
        checkBetErrorTimer = setTimeout(() => {
          checkBetErrorAndTrySettleAgain(callback);
        }, 10000);
      }
      catch (ex) {
        console.error('server > bot > index > 80 >', ex.toString());
        cb && cb(ex);
      }
    });
  },
  stop() {
    clearTimeout(checkBetErrorTimer);
    stop = true;
  }
}