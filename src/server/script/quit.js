const Contract = require('../../contracts');
const Web3 = require('web3');


var accounts = [ { address: '0x1b365f91884767ba1E89560c544611380605be62',
privateKey: '0x8960f29c73c94a055f5c027a37cba87c6214017c9cd8322b3430d8c5fdd8ef48' },
{ address: '0x9a0cEf294AcF1FDa411288b4d9561236F6C50877',
privateKey: '0x64926f2daae1f4f3a285a0c429cd5dd77b136013382b8e6f2dd164135cf2c86b' },
{ address: '0x833CC13cFa1d65Bf00A3553f2D957f0694B1a0B3',
privateKey: '0x8d046a122db886dfe48de4f6bebc30e5ceac4d84adfc8bbaa336e08f71b1ae8a' },
{ address: '0x7ab0e4Aa449a3f86db37F1A761c6EBD5Fc1bd479',
privateKey: '0x5232f14753692d655b79a91977024606f202ad803cbd11a3f8fdcb52e816788a' },
{ address: '0x1F9809F3Ef303413102eE0144d2888a22fDffE84',
privateKey: '0x3dda968a9dc7f30b93205b2ac3c35aabe01a592b3eaebe98c5950c26127eb9d5' },
{ address: '0xae5EaB2785e3CF381022e72FC876b624c8c296B1',
privateKey: '0x9e576ecaa21a6d1b5b21459ad86dfcccb0f2e6f035214b854cade89480928098' },
{ address: '0x8A931FF5A61523886bc46cf33CAd096ea1659C89',
privateKey: '0x7ef95be76a9222639632961629c3f615678c92090493a79976cb1f8fe9d86926' },
{ address: '0x34Cb51462b87858DaB098f60d6Ebc30f9552271b',
privateKey: '0xbc438e10d4e4c6868b1a338d0447277df3daed6a7e08cc7772ed89c68e72e3da' },
{ address: '0x470A14c83511dDA4bcE6B763501077FB8ab6E3F1',
privateKey: '0x076b0ce73a25b99b784015dd67d0de8260fc71eb45eeb97b9d7993a3919a85a5' },
{ address: '0x36bba300146c1Cdc618450BDf8e994F622fF52B1',
privateKey: '0x10124dd9b2901cc6d59e474951d5500d10ff7f3cf36e5f62de333abdbeabdc00' },
{ address: '0x2005C4F1fA95e2Cd12793234cCf8b5a74BeC6785',
privateKey: '0x8d090b4efd1e3f22e0f2bc9896002d347df8f66f49d193ac924d3ced4988ee97' },
{ address: '0x7451c8Ce77a56317043FF3B8860e2f7bEb56a643',
privateKey: '0xef01febe541e28d907b570d711a35ac18b4361a5a880f323a197cd0ef6092ec2' },
{ address: '0xD3e6c69AC5C0E071Ab44AF64C66df0B89DBaEdcA',
privateKey: '0x527c8cd444b7badaa0aede7f3b388b52207092e77b7ebc3e96af6f59e149c057' },
{ address: '0xB7e15554a19A4C248B2D5F7501B86E36A91725B1',
privateKey: '0x3858571b28bc9f2b23e54fdbd11d4a670b5fdd2e2667e6bc770a4ff02c08c98a' },
{ address: '0x0F4835c60ef366034b96A190D6d868348b73026f',
privateKey: '0x789b1516e3a2bb0198bebe13d0a843849248b309c2a5608795e9323cc30bd02c' },
{ address: '0xe4F814A16e50A68c804f46663402a80d05EB0b47',
privateKey: '0x180bf6409b2c86c2350f53dd1441a6904e9f543d5559cddc7a2fcf529df9e5fc' },
{ address: '0x511D099f5E7D7DEaa84C6d0fd41eF3071277c987',
privateKey: '0xe11f517a4428100f8999723fad48b574302b1f1fd8973c34d90da40bc2c295f0' },
{ address: '0x7511Ee16209eD13309E71723A22290703fa3B122',
privateKey: '0xefbd149d5319074f7dedaf7f524285abf9b61e9f7ad3ba07e3ae9371e7e3b683' },
{ address: '0x224a0C57cea4bb17671f5265f3873A7cC2F7Bff6',
privateKey: '0x864f0d31016752cb7382d0ac058b941f18bb676bfd2fbb5fa87c799aa2fc7346' },
{ address: '0x466f36569C7d87EC1E9e815e2b9DE4Ea3E87518f',
privateKey: '0x406102210102c88c59b9e09d3d1ece2857fffe5dc71b00f1ef2d2e5c52751c9f' } ]

async function quitPool(i) {
  Contract.login({
    privateKey: accounts[i].privateKey
  }, async(err, address) => {
    console.log(err || address);
    var hash = await Contract.quitPool();
    await Contract.get.checkTx(hash);
    console.log(hash);
    quitPool(i+1);
  })
}

quitPool(0)