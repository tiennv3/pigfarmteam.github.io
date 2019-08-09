pragma solidity 0.5.0;

import "./PoolContract.sol";
import "./SafeMath.sol";
contract IGame {
    function validateInput(uint[5] memory values) public view returns (bool);
    function winChance(uint[5] memory values) public view returns (uint);
    function isWin(uint[5] memory values, uint randomNumber) public view returns (bool);
    function winAmount(uint[5] memory values, uint house, uint amount) public view returns (uint);
}

contract IReferral {
  function set(address from, address to) public;
  function get(address to) public view returns (address);
}

contract MaxBetContract is PoolContract {
    using SafeMath for uint;

    struct Bet {
        uint index;
        uint amount;
        address payable player;
        uint round;
        uint luckyNumber;
        uint seed;
        bool isFinished;
        uint[5] values;
        address game;
    }

    struct Random {
        bytes32 commitment;
        uint secret;         // greater than zero
    }

    struct PlayerAmount {
        uint totalBet;
        uint totalPayout;
    }

    // SETTING
    uint constant public NUMBER_BLOCK_OF_LEADER_BOARD = 43200;
    uint constant public MAX_LEADER_BOARD = 10;
    uint constant public MINIMUM_BET_AMOUNT = 0.1 ether;
    uint constant public HOUSE_EDGE = 2;
    uint public PRIZE_PER_BET_LEVEL = 10;

    // Just for display on app
    uint public totalBetOfGame = 0;
    uint public totalWinAmountOfGame = 0;

    Random[] public rands;
    mapping(uint => uint) public roundToRandIndex; // block.number => index of rands
    uint public randIndexForNextRound = 0;

    mapping(address => bool) public games;


    // Properties for game
    Bet[] public bets; // All bets of player
    uint public numberOfBetWaittingDraw = 0; // Count bet is not finished
    uint public indexOfDrawnBet = 1; // Point to start bet, which need to check finish. If not finish, finish it to release lock balance
    mapping(address => uint[]) public betsOf; // Store all bet of player
    mapping(address => PlayerAmount) public amountOf; // Store all bet of player

    mapping(address => bool) public croupiers;

    // Preperties for leader board
    uint[] public leaderBoardRounds; // block will sent prize
    mapping(uint => mapping(address => uint)) public totalBetOfPlayers; //Total bet of player in a round of board: leaderBoardBlock => address => total amount
    mapping(uint => address[]) public leaderBoards; //Leader board of a round of board: leaderBoardBlock => array of top players
    mapping(uint => mapping(address => uint)) public leaderBoardWinners; // round => player => prize

    address public referral;

    event TransferWinner(address winner, uint betIndex, uint amount);
    event TransferLeaderBoard(address winner, uint round, uint amount);
    event NewBet(uint index);
    event DrawBet(uint index);

    constructor(address payable _operator, address _croupier, address _referral) public {
        referral = _referral;
        operator = _operator;
        croupiers[_croupier] = true;
        leaderBoardRounds.push(block.number + NUMBER_BLOCK_OF_LEADER_BOARD);

        rands.push(Random({
            commitment: bytes32(0),
            secret: 0
        }));
        randIndexForNextRound = 1;
        Bet memory bet = Bet({
            game: address(0x0),
            values: [uint(0), uint(0), uint(0), uint(0), uint(0)],
            amount: 0,
            player: address(0x0),
            round: 0,
            isFinished: true,
            luckyNumber: 0,
            index: 0,
            seed: 0
        });

        bets.push(bet);
    }

    modifier onlyCroupier() { require(croupiers[msg.sender], "not croupier"); _; }


    function bet(uint i) public view returns(
        uint amount,
        address player,
        uint round,
        uint luckyNumber,
        uint seed,
        bool isFinished,
        uint[5] memory values,
        address game
    ) {
        Bet memory b = bets[i];
        amount = b.amount;
        player = b.player;
        round = b.round;
        luckyNumber = b.luckyNumber;
        seed = b.seed;
        isFinished = b.isFinished;
        values = b.values;
        game = b.game;
    }
    /**
    GET FUNCTION
     */

    function getLastBetIndex(address add) public view returns (uint) {
        if (betsOf[add].length == 0) return 0;
        return betsOf[add][betsOf[add].length - 1];
    }

    function getLastRand() public view  returns (bytes32 commitment, uint secret, uint index) {
        index = rands.length - 1;
        commitment = rands[index].commitment;
        secret = rands[index].secret;
    }

    function getCurrentLeaderBoard() public view returns (uint currentRound, address[] memory players) {
        currentRound = leaderBoardRounds[leaderBoardRounds.length - 1];
        players = leaderBoards[leaderBoardRounds[leaderBoardRounds.length - 1]];
    }

    function getRoundLeaderBoard(uint index, bool isFromTail) public view returns (uint) {
        if (isFromTail) {
            return leaderBoardRounds[leaderBoardRounds.length - index - 1];
        }
        else {
            return leaderBoardRounds[index];
        }
    }

    function totalNumberOfBets(address player) public view returns(uint) {
        if (player != address(0x00)) return betsOf[player].length;
        else return bets.length;
    }

    function numberOfLeaderBoardRounds() public view returns (uint) {
        return leaderBoardRounds.length;
    }

    /**
    BET RANGE
     */

    function calculatePrizeForBet(uint betAmount) public view returns (uint) {
        uint bal = super.balanceForGame(betAmount);
        uint prize = 1 ether;
        if      (bal > 1000000 ether) prize = 500 ether;
        else if (bal >  500000 ether) prize = 200 ether;
        else if (bal >  200000 ether) prize = 100 ether;
        else if (bal >   50000 ether) prize =  50 ether;
        else if (bal >   20000 ether) prize =  20 ether;
        else if (bal >    2000 ether) prize =  10 ether;
        else                          prize =   5 ether;

        if (PRIZE_PER_BET_LEVEL > 1000) return prize.mul(100);
        else if (PRIZE_PER_BET_LEVEL < 10) return prize;
        else return prize.mul(PRIZE_PER_BET_LEVEL).div(10);
    }

    function betRange(address game, uint[5] memory values, uint amount) public view returns (uint min, uint max) {
        uint currentWinChance = IGame(game).winChance(values);
        uint prize = calculatePrizeForBet(amount);
        min = MINIMUM_BET_AMOUNT;
        max = prize.mul(currentWinChance).div(100);
        max = max > MINIMUM_BET_AMOUNT ? max : MINIMUM_BET_AMOUNT;
    }

    /**
    BET
     */

    function addToLeaderBoard(address player, uint amount) private {
        uint round = leaderBoardRounds[leaderBoardRounds.length - 1];
        address[] storage boards = leaderBoards[round];
        mapping(address => uint) storage totalBets = totalBetOfPlayers[round];

        totalBets[player] = totalBets[player].add(amount);
        if (boards.length == 0) {
            boards.push(player);
        }
        else {
            // If found the player on list, set minIndex = MAX_LEADER_BOARD as a flag
            // to check it. if not found the play on array, minIndex is always
            // less than MAX_LEADER_BOARD
            uint minIndex = 0;
            for (uint i = 0; i < boards.length; i++) {
                if (boards[i] == player) {
                    minIndex = MAX_LEADER_BOARD;
                    break;
                } else if (totalBets[boards[i]] < totalBets[boards[minIndex]]) {
                    minIndex = i;
                }
            }
            if (minIndex < MAX_LEADER_BOARD) {
                if (boards.length < MAX_LEADER_BOARD) {
                    boards.push(player);
                } else if (totalBets[boards[minIndex]] < totalBets[player]) {
                    boards[minIndex] = player;
                }
            }
        }
    }

    /**
    DRAW WINNER
    */

    function getRandomNumber(uint betIndex) private view returns (uint) {
        Bet memory b = bets[betIndex];

        if (roundToRandIndex[b.round] == 0) return 0;
        if(b.round >= block.number) return 0;

        Random memory rand = rands[roundToRandIndex[b.round]];
        if (rand.secret == 0) return 0;

        uint blockHash = uint(blockhash(b.round));
        if (blockHash == 0) {
            blockHash = uint(blockhash(block.number - 1));
        }
        uint v = (rand.secret ^ b.seed ^ blockHash);
        if (v == uint(-1)) {
            return v;
        }
        else {
            return v + 1;
        }
    }

    /**
    WRITE & PUBLIC FUNCTION
     */

    //A function only called from outside should be external to minimize gas usage
    function placeBet(address game, uint[5] memory values, uint seed, address ref) public payable notStopped {
        uint round = block.number;

        uint betAmount = msg.value;

        uint minAmount;
        uint maxAmount;
        uint lastBetIdx = getLastBetIndex(msg.sender);
        (minAmount, maxAmount)= betRange(game, values, betAmount);

        require(game != address(0));
        require(rands.length > 0 && randIndexForNextRound < rands.length);
        require(minAmount > 0 && maxAmount > 0);
        require(IGame(game).validateInput(values));
        require(minAmount <= betAmount && betAmount <= maxAmount);
        require(bets[lastBetIdx].isFinished);

        IReferral(referral).set(ref, msg.sender);

        if (roundToRandIndex[round] == 0) {
            roundToRandIndex[round] = randIndexForNextRound;
            randIndexForNextRound += 1;
        }

        uint winAmount = IGame(game).winAmount(values, HOUSE_EDGE, betAmount);
        super.newBet(betAmount, winAmount);

        uint index = bets.length;

        totalBetOfGame += betAmount;

        betsOf[msg.sender].push(index);
        numberOfBetWaittingDraw++;
        bets.push(Bet({
            index: index,
            game: game,
            values: values,
            amount: betAmount,
            player: msg.sender,
            round: round,
            isFinished: false,
            luckyNumber: 0,
            seed: seed
            }));
        emit NewBet(index);
    }

    function refundBet(address payable add) external {
        uint betIndex = getLastBetIndex(add);
        Bet storage b = bets[betIndex];
        require(!b.isFinished && b.player == add && block.number - b.round > 150, "cannot refund");

        uint winAmount = IGame(b.game).winAmount(b.values, HOUSE_EDGE, b.amount);

        add.transfer(b.amount);
        super.finishBet(b.amount, winAmount);

        numberOfBetWaittingDraw--;
        b.isFinished = true;
        b.amount = 0;
    }

    function sendPrizeToWinners(uint round, address payable win1, address payable win2, address payable win3) private {
        if (win1 == address(0x00)) return;

        uint prize1 = 0;
        uint prize2 = 0;
        uint prize3 = 0;

        if (win3 != address(0x00)) prize3 = totalPrize.mul(2).div(10);
        if (win2 != address(0x00)) prize2 = totalPrize.mul(3).div(10);
        prize1 = totalPrize.sub(prize2).sub(prize3);

        if (prize3 > 0) {
            super.sendPrizeToWinner(win3, prize3);
            leaderBoardWinners[round][win3] = prize3;
            emit TransferLeaderBoard(win3, round, prize3);
        }
        if (prize2 > 0) {
            super.sendPrizeToWinner(win2, prize2);
            leaderBoardWinners[round][win2] = prize2;
            emit TransferLeaderBoard(win2, round, prize2);
        }
        super.sendPrizeToWinner(win1, prize1);
        emit TransferLeaderBoard(win1, round, prize1);
        leaderBoardWinners[round][win1] = prize1;

    }

    function finishLeaderBoard() public {
        uint round = leaderBoardRounds[leaderBoardRounds.length - 1];
        address[] storage boards = leaderBoards[round];
        mapping(address => uint) storage totalBets = totalBetOfPlayers[round];

        if (round > block.number) return;
        if (boards.length == 0) return;

        if (totalPrize <= 0) {
            leaderBoardRounds.push(block.number + NUMBER_BLOCK_OF_LEADER_BOARD);
            return;
        }

        // boards have maximum 3 elements.
        for (uint i = 0; i < boards.length; i++) {
        for (uint j = i + 1; j < boards.length; j++) {
            if (totalBets[boards[j]] > totalBets[boards[i]]) {
                address temp = boards[i];
                boards[i] = boards[j];
                boards[j] = temp;
            }
        }
        }

        address w1 = boards[0];
        address w2 = boards.length > 1 ? boards[1] : address(0x00);
        address w3 = boards.length > 2 ? boards[2] : address(0x00);

        sendPrizeToWinners(round,
            address(uint160(w1)),
            address(uint160(w2)),
            address(uint160(w3)));
        leaderBoardRounds.push(block.number + NUMBER_BLOCK_OF_LEADER_BOARD);
    }

    /**
    FOR OPERATOR
     */

    function settleBet(uint n) public onlyCroupier {
        if (indexOfDrawnBet >= bets.length) return;

        n = n > 0 ? n : bets.length - indexOfDrawnBet;
        for (uint i = 0; i < n && indexOfDrawnBet < bets.length; i++) {
            Bet storage b = bets[indexOfDrawnBet];

            uint r = b.round;
            if (r >= block.number) return;

            indexOfDrawnBet++;
            if (b.isFinished) continue;

            uint luckyNum = getRandomNumber(b.index);
            if (luckyNum == 0) {
                indexOfDrawnBet--;
                return;
            }
            luckyNum -= 1;

            uint winAmount = IGame(b.game).winAmount(b.values, HOUSE_EDGE, b.amount);

            b.luckyNumber = luckyNum;
            b.isFinished = true;
            numberOfBetWaittingDraw--;

            if (IGame(b.game).isWin(b.values, luckyNum)) {
                totalWinAmountOfGame += winAmount;
                b.player.transfer(winAmount);
                super.finishBet(b.amount, winAmount);
                amountOf[b.player].totalBet += b.amount;
                amountOf[b.player].totalPayout += winAmount;
                emit TransferWinner(b.player, b.index, winAmount);
            } else {
                super.finishBet(b.amount, winAmount);
                amountOf[b.player].totalBet += b.amount;
            }

            addToLeaderBoard(b.player, b.amount);
            super.shareProfitForPrize(b.amount);
            super.shareProfitForRef(b.amount, IReferral(referral).get(b.player));
            emit DrawBet(b.index);
        }
    }

    function commit(bytes32 _commitment) public onlyCroupier {
        require(bytes32(0) != _commitment, "commitment is invalid");
        require(bytes32(0x290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e563) != _commitment, "Secret should not be 0");
        rands.push(Random({
            commitment: _commitment,
            secret: 0
        }));
    }

    function reveal(uint round, uint _secret) public onlyCroupier {
        require(roundToRandIndex[round] > 0, "Invalid round");

        Random storage rand = rands[roundToRandIndex[round]];
        require(round < block.number, "Cannot settle in this block");
        require(keccak256(abi.encodePacked((_secret))) == rand.commitment, "Submitted secret is not matching with the commitment");

        rand.secret = _secret;
    }

    // Should use hight gasPrice
    function nextTick(uint round, uint secret, bytes32 commitment, uint numberFinish) external onlyCroupier {
        if (round > 0 && secret > 0) {
            reveal(round, secret);
        }
        if (commitment != bytes32(0)) {
            commit(commitment);
        }
        settleBet(numberFinish);
        super.takeProfitInternal(false, 0);
        finishLeaderBoard();
    }

    function moveRandIndexForNextRound(uint newIndex) public onlyCroupier {
        require(newIndex >= randIndexForNextRound, "New index must be greater than old index");
        randIndexForNextRound = newIndex;
    }

    function addCroupier(address add) external onlyOperator {
        croupiers[add] = true;
    }

    function removeCroupier(address add) external onlyOperator {
        croupiers[add] = false;
    }

    function addGame(address add) external onlyOperator {
        games[add] = true;
    }

    function removeGame(address add) external onlyOperator {
        games[add] = false;
    }

    function setPrizeLevel(uint level) external onlyOperator {
        PRIZE_PER_BET_LEVEL = level;
    }
}