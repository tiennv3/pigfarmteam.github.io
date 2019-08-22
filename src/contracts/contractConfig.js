const abi = require('./abi');

module.exports = {
  ABI: abi,

  RPC: process.env.NODE_ENV === 'production' ?
    'https://rpc.tomochain.com' :
    'https://testnet.tomochain.com',

  RPC_READ: process.env.NODE_ENV === 'production' ?
    'https://rpc.tomochain.com' :
    'https://testnet.tomochain.com',

  RPC_READ_SOCKET: process.env.NODE_ENV === 'production' ?
    'wss://ws.tomochain.com' :
    'wss://testnet.tomochain.com/ws',

  NETWORK_ID: process.env.NODE_ENV === 'production' ? '88' : '89',
  ADDRESS: process.env.NODE_ENV === 'production' ?
    '0x305f55a3d55e01eed0b2b33fa1fd035ac5d086f7' :
    '0xcc90707837b5701628a91723684cc78651839bff'
}