pragma solidity 0.5.0;

/**
1: over = 1, under = 0
2: number: 1...98
 */

contract SpinContract {
  function validateInput(uint[5] memory values) public pure returns (bool){
    return values[0] == 0 || values[0] == 1;
  }
  function winChance(uint[5] memory values) public pure returns (uint) {
    return 50;
  }
  function isWin(uint[5] memory values, uint randomNumber) public pure returns (bool) {
    return values[0] == randomNumber % 2;
  }
  function winAmount(uint[5] memory values, uint house, uint amount) public pure returns (uint) {
    return amount * (100 - house) / 50;
  }
}
