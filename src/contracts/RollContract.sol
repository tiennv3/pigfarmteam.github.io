pragma solidity 0.5.0;

/**
1: over = 1, under = 0
2: number: 1...98

 */

contract RollContract {
  function validateInput(uint[5] memory values) public pure returns (bool){
    bool isOver = values[0] == 1;
    uint number = values[1];
    return isOver ?
      number >= 4 && number <= 98 :
      number >= 1 && number <= 95;
  }
  function winChance(uint[5] memory values) public pure returns (uint) {
    bool isOver = values[0] == 1;
    uint number = values[1];
    return isOver ? 99 - number : number;
  }
  function isWin(uint[5] memory values, uint randomNumber) public pure returns (bool) {
    bool isOver = values[0] == 1;
    uint number = values[1];
    uint luckyNumber = randomNumber % 100;
    return (isOver && number < luckyNumber) || (!isOver && number > luckyNumber);
  }
  function winAmount(uint[5] memory values, uint house, uint amount) public pure returns (uint) {
    bool isOver = values[0] == 1;
    uint number = values[1];
    uint winChange = isOver ? 99 - number : number;
    return amount * (100 - house) / winChange;
  }
}
