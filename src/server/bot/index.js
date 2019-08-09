const Contract = require('../../contracts');
const CommitReveal = require('./CommitReveal');
const gameInit = require('./gameInit');

const MAX_FINISH_BET = 100;

var nextTickTimer;
var stop = false;
var lastBlockNumber = 0;
var checkRound = {}

async function getBetForSettle() {
  try {
    var i = await Contract.get.indexOfDrawnBet();
    var bet = await Contract.get.bet(i);
    return bet
  } catch (ex) {
    // console.log(ex);
  }

  return null;
}


async function nextTick(cb) {
  try {
    if (stop) return;

    var bet = await getBetForSettle();
    if (bet && !checkRound[bet.round]) {
      var settle = await CommitReveal.getSecretForBet(bet);
      if (settle.round == 0) {
        return;
      }
      var commitment = await CommitReveal.generateCommitment();
      var hash = await Contract.nextTick(settle.round, settle.secret, commitment, MAX_FINISH_BET);
      console.log(`NextTick: ${hash}`)
      console.log('');
      checkRound[bet.round] = true;

      if (process.env.WAIT_CONFIRM == 'true') {
        await Contract.get.checkTx(hash);
      }
    }
    else {
      return;
    }
  }
  catch (ex) {
    console.log(ex.toString());
    cb && cb(ex);
  }
}

module.exports = {
  start: (callback) => {
    stop = false;
    clearInterval(nextTickTimer);
    Contract.login({
      privateKey: process.env.PRIVATE_KEY
    }, async (err, address) => {
      if (err) return callback && callback(err);

      console.log('Connect wallet:', address);
      try {
        await gameInit();
        this.nextTickTimer = setInterval(() => {
          nextTick(callback);
        }, 100);
      }
      catch (ex) {
        return callback && callback(ex);
      }
    });
  },
  stop() {
    stop = true;
  }
}