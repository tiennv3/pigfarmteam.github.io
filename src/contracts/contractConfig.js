module.exports = {
  ABI: require('./abi'),
  ABI_REFERRAL: require('./abi_referral'),

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
  REFERRAL_ADDRESS: process.env.NODE_ENV === 'production' ?
    '0x8a076e40b635d204cf10f5b448b5caae93599e9d' :
    '0xc0f96f7d7b8f62a9b08e7a8f5bb5113eba6aa991',
  ADDRESS: process.env.NODE_ENV === 'production' ?
    '0xbf1dcb735e512b731abd3404c15df6431bd03d42' :
    '0xcc90707837b5701628a91723684cc78651839bff'
}