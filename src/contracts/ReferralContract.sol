pragma solidity 0.5.0;

contract ReferralContract {
  mapping(address => address) public referral;
  mapping(address => bool) public games;
  address public owner;
  address public newOwner;

  constructor(address _owner) public {
    owner = _owner;
  }

  function addGame(address game) public {
    require(msg.sender == owner);
    games[game] = true;
  }

  function removeGame(address game) public {
    require(msg.sender == owner);
    games[game] = false;
  }

  function transferOwner(address _newOwner) public {
    require(msg.sender == owner);
    newOwner = _newOwner;
  }

  function confrimTransfer() public {
    require(msg.sender == newOwner);
    owner = newOwner;
  }

  function set(address from, address to) public {
    if (games[msg.sender] && from != to && referral[to] == address(0x0)) {
      referral[to] = from;
    }
  }

  function get(address to) public view returns (address) {
    return referral[to];
  }
}
