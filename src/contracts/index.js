const HDWalletProvider = require('truffle-hdwallet-provider');
const Web3 = require('web3');
const ContractGetFunctions = require('./contractGetFunctions');
const CONTRACT_CONFIG = require('./contractConfig');

var connectStatus = '';
var LuckyContract = null;
var web3 = null;
var currentNetwork = '';
var metamaskAccountInterval = '';
var address = '';

function loginViaPrivateKey(privateKey, hdpath, cb) {
  if (privateKey) {
    try {
      var provider = new HDWalletProvider(privateKey, CONTRACT_CONFIG.RPC, 0, 1, false, hdpath);
      web3 = new Web3(provider);
      LuckyContract = new web3.eth.Contract(CONTRACT_CONFIG.ABI, CONTRACT_CONFIG.ADDRESS);
      address = provider.addresses[0];
      web3.eth.defaultAccount = address;
      connectStatus = 'privatekey';
      cb && cb(null, address, {
        RPC: CONTRACT_CONFIG.RPC,
        ADDRESS: CONTRACT_CONFIG.ADDRESS
      });
    }
    catch (ex) {
      console.log(ex);
      cb && cb('Cannot login with your private key');
    }
  }
}

function loginViaMetamask(cb) {
  if (typeof window.web3 == 'undefined') {
    return cb && cb('MetaMask is not installed')
  }

  web3 = new Web3(window.web3.currentProvider);
  LuckyContract = new web3.eth.Contract(CONTRACT_CONFIG.ABI, CONTRACT_CONFIG.ADDRESS);

  window.web3.eth.getAccounts(function (err, accounts) {
    if (err) {
      return cb && cb('Have an error with Metamask')
    }
    else if (accounts.length === 0) {
      return cb && cb('Unlock Metamask, please')
    }
    connectStatus = 'metamask';
    address = accounts[0];
    cb && cb(null, accounts[0], {
      RPC: CONTRACT_CONFIG.RPC,
      ADDRESS: CONTRACT_CONFIG.ADDRESS
    });

    metamaskAccountInterval = setInterval(() => {
      window.web3.eth.getAccounts((err, accounts) => {
        if (address && accounts.length > 0 && accounts[0] !== address) {
          address = accounts[0]
          window.location.reload();
          cb && cb(null, address);
        }
      });
    }, 1000);

    window.web3.version.getNetwork((err, netId) => {
      currentNetwork = netId;
//       if (netId != CONTRACT_CONFIG.NETWORK_ID) {
//         cb && cb(`Uknown network, change network to TomoChain or Add new Custom RPC by following steps:\n
// 1. Click to Network Dropdown then Select "Custom RPC"
// 2. Scroll down to New Network session
// 3. Enter New RPC URL: https://rpc.tomochain.com
// 4. Click Show Advanced Options
// 5. Enter ChainId: 88, Symbol: TOMO, Nickname: TomoChain
// 6. Click Save button`);
//       }
    });
  });
}

function loginViaTomoWallet(cb) {
  web3 = new Web3(window.web3.currentProvider);
  LuckyContract = new web3.eth.Contract(CONTRACT_CONFIG.ABI, CONTRACT_CONFIG.ADDRESS);
  window.web3.eth.getAccounts(function (err, accounts) {
    connectStatus = 'tomowallet';
    address = accounts[0];
    cb && cb(null, address, {
      RPC: CONTRACT_CONFIG.RPC,
      ADDRESS: CONTRACT_CONFIG.ADDRESS
    });
  });

  window.web3.version.getNetwork((err, netId) => {
    currentNetwork = netId;
    if (netId != CONTRACT_CONFIG.NETWORK_ID) {
      alert('Uknown network, change network to TomoChain, please');
    }
  });
}

function checkBeforeDoTransaction() {

  if (!address) {
    return 'Login to play plese';
  }

  if (!web3 || !LuckyContract) {
    return 'ERROR'
  }

  if (connectStatus === 'address') {
    return "Cannot draw, login again please";
  }
  if (connectStatus === 'metamask') {
    if (currentNetwork != CONTRACT_CONFIG.NETWORK_ID) {
      // return "Please change network on Metamask to TomoChain (mainnet)";
      return `Uknown network, change network to TomoChain or Add new Custom RPC by following steps:\n
<i style="color: blue">1.</i> Click to Network Dropdown then Select <b>"Custom RPC"</b>
<i style="color: blue">2.</i> Scroll down to New Network session
<i style="color: blue">3.</i> Enter New RPC URL: <b>https://rpc.tomochain.com</b>
<i style="color: blue">4.</i> Click Show Advanced Options
<i style="color: blue">5.</i> Enter ChainId: <b>88</b>, Symbol: <b>TOMO</b>, Nickname: <b>TomoChain</b>
<i style="color: blue">6.</i> Click Save button`;
    }
  }

  if (connectStatus === 'tomowallet') {
    if (currentNetwork != CONTRACT_CONFIG.NETWORK_ID) {
      return "Please change network on TomoWallet to TomoChain (mainnet)";
    }
  }

  return "";
}

module.exports = {
  get: ContractGetFunctions,

  login: function (data, cb) {
    if (data.address) {
      connectStatus = 'address';
      address = data.address;
      cb && cb(null, address);
    }
    else if (data.privateKey) {
      loginViaPrivateKey(data.privateKey, data.hdpath + '/0', cb);
    }
    else if (data.metamask) {
      loginViaMetamask(cb);
    }
    else if (data.tomowallet) {
      loginViaTomoWallet(cb);
    }
  },
  logout: function () {
    address = '';
    currentNetwork = '';
    connectStatus = '';
    web3 = null;
    LuckyContract = null;
    clearInterval(metamaskAccountInterval);
  },
  accountInfo() {
    return {
      address,
      connectStatus
    }
  },
  placeBet: function (amount, number, isOver) {
    var msg = checkBeforeDoTransaction();
    if (msg) {
      return new Promise((resolve, reject) => {
        reject(new Error(msg));
      })
    }
    else {
      var seed = web3.utils.randomHex(32);
      return new Promise((resolve, reject) => {
        return LuckyContract.methods
          .placeBet(number, isOver, 1, seed)
          .send({
            from: address,
            to: CONTRACT_CONFIG.ADDRESS,
            value: web3.utils.toHex(web3.utils.toWei(amount.toString(), 'ether')),
            gasLimit: web3.utils.toHex(1000000),
            gasPrice: web3.utils.toHex(web3.utils.toWei('0.25', 'gwei'))
          })
          .on('transactionHash', hash => resolve(hash))
          .on('error', ex => reject(ex));
      });
    }
  },
  joinPool: function (amount) {
    var msg = checkBeforeDoTransaction();
    if (msg) {
      return new Promise((resolve, reject) => {
        reject(new Error(msg));
      })
    }
    else {
      return new Promise((resolve, reject) => {
        return LuckyContract.methods
          .joinPool()
          .send({
            from: address,
            to: CONTRACT_CONFIG.ADDRESS,
            value: web3.utils.toHex(web3.utils.toWei(amount.toString(), 'ether')),
            gasLimit: web3.utils.toHex(1000000),
            gasPrice: web3.utils.toHex(web3.utils.toWei('0.251', 'gwei'))
          })
          .on('transactionHash', hash => resolve(hash))
          .on('error', ex => reject(ex));
      })
    }
  },
  quitPool: function () {
    var msg = checkBeforeDoTransaction();
    if (msg) {
      return new Promise((resolve, reject) => {
        reject(new Error(msg));
      })
    }
    else {
      return new Promise((resolve, reject) => {
        return LuckyContract.methods
          .quitPool()
          .send({
            from: address,
            to: CONTRACT_CONFIG.ADDRESS,
            gasLimit: web3.utils.toHex(1000000),
            gasPrice: web3.utils.toHex(web3.utils.toWei('0.251', 'gwei'))
          })
          .on('transactionHash', hash => resolve(hash))
          .on('error', ex => reject(ex));
      })
    }
  },
  withdrawProfit: function() {
    var msg = checkBeforeDoTransaction();
    if (msg) {
      return new Promise((resolve, reject) => {
        reject(new Error(msg));
      })
    }
    else {
      return new Promise((resolve, reject) => {
        return LuckyContract.methods
          .withdrawProfit()
          .send({
            from: address,
            to: CONTRACT_CONFIG.ADDRESS,
            gasLimit: web3.utils.toHex(1000000),
            gasPrice: web3.utils.toHex(web3.utils.toWei('0.251', 'gwei'))
          })
          .on('transactionHash', hash => resolve(hash))
          .on('error', ex => reject(ex));
      })
    }
  },
  takeProfit: function() {
    var msg = checkBeforeDoTransaction();
    if (msg) {
      return new Promise((resolve, reject) => {
        reject(new Error(msg));
      })
    }
    else {
      return new Promise((resolve, reject) => {
        return LuckyContract.methods
          .takeProfit()
          .send({
            from: address,
            to: CONTRACT_CONFIG.ADDRESS,
            gasLimit: web3.utils.toHex(1000000),
            gasPrice: web3.utils.toHex(web3.utils.toWei('0.251', 'gwei'))
          })
          .on('transactionHash', hash => resolve(hash))
          .on('error', ex => reject(ex));
      })
    }
  },
  finishLeaderBoard: function() {
    var msg = checkBeforeDoTransaction();
    if (msg) {
      return new Promise((resolve, reject) => {
        reject(new Error(msg));
      })
    }
    else {
      return new Promise((resolve, reject) => {
        LuckyContract.methods
          .finishLeaderBoard()
          .send({
            from: address,
            to: CONTRACT_CONFIG.ADDRESS,
            gasLimit: web3.utils.toHex(1000000),
            gasPrice: web3.utils.toHex(web3.utils.toWei('0.25', 'gwei'))
          })
          .on('transactionHash', hash => resolve(hash))
          .on('error', ex => reject(ex));
      })
    }
  },
  nextTick: function(round, secret, commitment, numberFinish) {
    var msg = checkBeforeDoTransaction();
    if (msg) {
      return new Promise((resolve, reject) => {
        reject(new Error(msg));
      })
    }
    else {
      return new Promise((resolve, reject) => {
        LuckyContract.methods
          .nextTick(round, secret, commitment, numberFinish)
          .send({
            from: address,
            to: CONTRACT_CONFIG.ADDRESS,
            gasLimit: web3.utils.toHex(2000000),
            gasPrice: web3.utils.toHex(web3.utils.toWei('0.252', 'gwei'))
          })
          .on('transactionHash', hash => resolve(hash))
          .on('error', ex => reject(ex));
      })
    }
  },
  commit: function(commitment) {
    var msg = checkBeforeDoTransaction();
    if (msg) {
      return new Promise((resolve, reject) => {
        reject(new Error(msg));
      })
    }
    else {
      return new Promise((resolve, reject) => {
        LuckyContract.methods
          .commit(commitment)
          .send({
            from: address,
            to: CONTRACT_CONFIG.ADDRESS,
            gasLimit: web3.utils.toHex(1000000),
            gasPrice: web3.utils.toHex(web3.utils.toWei('0.25', 'gwei'))
          })
          .on('transactionHash', hash => resolve(hash))
          .on('error', ex => reject(ex));
      })
    }
  },
  reveal: function(round, secret) {
    var msg = checkBeforeDoTransaction();
    if (msg) {
      return new Promise((resolve, reject) => {
        reject(new Error(msg));
      })
    }
    else {
      return new Promise((resolve, reject) => {
        LuckyContract.methods
          .reveal(round, secret)
          .send({
            from: address,
            to: CONTRACT_CONFIG.ADDRESS,
            gasLimit: web3.utils.toHex(1000000),
            gasPrice: web3.utils.toHex(web3.utils.toWei('0.25', 'gwei'))
          })
          .on('transactionHash', hash => resolve(hash))
          .on('error', ex => reject(ex));
      })
    }
  },
  rejoinPool: function(add) {
    var msg = checkBeforeDoTransaction();
    if (msg) {
      return new Promise((resolve, reject) => {
        reject(new Error(msg));
      })
    }
    else {
      return new Promise((resolve, reject) => {
        LuckyContract.methods
          .rejoinPool(add)
          .send({
            from: address,
            to: CONTRACT_CONFIG.ADDRESS,
            gasLimit: web3.utils.toHex(1000000),
            gasPrice: web3.utils.toHex(web3.utils.toWei('0.25', 'gwei'))
          })
          .on('transactionHash', hash => resolve(hash))
          .on('error', ex => reject(ex));
      })
    }
  },
  removeStaker: function(index) {
    var msg = checkBeforeDoTransaction();
    if (msg) {
      return new Promise((resolve, reject) => {
        reject(new Error(msg));
      })
    }
    else {
      return new Promise((resolve, reject) => {
        LuckyContract.methods
          .removeStaker(index)
          .send({
            from: address,
            to: CONTRACT_CONFIG.ADDRESS,
            gasLimit: web3.utils.toHex(1000000),
            gasPrice: web3.utils.toHex(web3.utils.toWei('0.25', 'gwei'))
          })
          .on('transactionHash', hash => resolve(hash))
          .on('error', ex => reject(ex));
      })
    }
  },
  removeDuplicateStaker: function(i, j) {
    var msg = checkBeforeDoTransaction();
    if (msg) {
      return new Promise((resolve, reject) => {
        reject(new Error(msg));
      })
    }
    else {
      return new Promise((resolve, reject) => {
        LuckyContract.methods
          .removeDuplicateStaker(i,j)
          .send({
            from: address,
            to: CONTRACT_CONFIG.ADDRESS,
            gasLimit: web3.utils.toHex(1000000),
            gasPrice: web3.utils.toHex(web3.utils.toWei('0.25', 'gwei'))
          })
          .on('transactionHash', hash => resolve(hash))
          .on('error', ex => reject(ex));
      })
    }
  },
  setPrizeLevel: function(level) {
    var msg = checkBeforeDoTransaction();
    if (msg) {
      return new Promise((resolve, reject) => {
        reject(new Error(msg));
      })
    }
    else {
      return new Promise((resolve, reject) => {
        LuckyContract.methods
          .setPrizeLevel(level)
          .send({
            from: address,
            to: CONTRACT_CONFIG.ADDRESS,
            gasLimit: web3.utils.toHex(1000000),
            gasPrice: web3.utils.toHex(web3.utils.toWei('0.25', 'gwei'))
          })
          .on('transactionHash', hash => resolve(hash))
          .on('error', ex => reject(ex));
      })
    }
  },
  setCroupier: function(address, isCroupier) {
    var msg = checkBeforeDoTransaction();
    if (msg) {
      return new Promise((resolve, reject) => {
        reject(new Error(msg));
      })
    }
    else {
      return new Promise((resolve, reject) => {
        LuckyContract.methods
          .setCroupier(address, isCroupier)
          .send({
            from: address,
            to: CONTRACT_CONFIG.ADDRESS,
            gasLimit: web3.utils.toHex(1000000),
            gasPrice: web3.utils.toHex(web3.utils.toWei('0.25', 'gwei'))
          })
          .on('transactionHash', hash => resolve(hash))
          .on('error', ex => reject(ex));
      })
    }
  },
  refundBet: function(address) {
    var msg = checkBeforeDoTransaction();
    if (msg) {
      return new Promise((resolve, reject) => {
        reject(new Error(msg));
      })
    }
    else {
      return new Promise((resolve, reject) => {
        LuckyContract.methods
          .refundBet(address)
          .send({
            from: address,
            to: CONTRACT_CONFIG.ADDRESS,
            gasLimit: web3.utils.toHex(1000000),
            gasPrice: web3.utils.toHex(web3.utils.toWei('0.25', 'gwei'))
          })
          .on('transactionHash', hash => resolve(hash))
          .on('error', ex => reject(ex));
      })
    }
  },
  operatorWithdraw: function(address, amount) {
    var msg = checkBeforeDoTransaction();
    if (msg) {
      return new Promise((resolve, reject) => {
        reject(new Error(msg));
      })
    }
    else {
      return new Promise((resolve, reject) => {
        LuckyContract.methods
          .operatorWithdraw(address, web3.utils.toHex(web3.utils.toWei(amount.toString(), 'ether')))
          .send({
            from: address,
            to: CONTRACT_CONFIG.ADDRESS,
            gasLimit: web3.utils.toHex(1000000),
            gasPrice: web3.utils.toHex(web3.utils.toWei('0.25', 'gwei'))
          })
          .on('transactionHash', hash => resolve(hash))
          .on('error', ex => reject(ex));
      })
    }
  },
  prizeForLeaderBoard: function (amount) {
    var msg = checkBeforeDoTransaction();
    if (msg) {
      return new Promise((resolve, reject) => {
        reject(new Error(msg));
      })
    }
    else {
      return new Promise((resolve, reject) => {
        return LuckyContract.methods
          .prizeForLeaderBoard()
          .send({
            from: address,
            to: CONTRACT_CONFIG.ADDRESS,
            value: web3.utils.toHex(web3.utils.toWei(amount.toString(), 'ether')),
            gasLimit: web3.utils.toHex(1000000),
            gasPrice: web3.utils.toHex(web3.utils.toWei('0.25', 'gwei'))
          })
          .on('transactionHash', hash => resolve(hash))
          .on('error', ex => reject(ex));
      });
    }
  },
}