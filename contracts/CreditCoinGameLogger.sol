// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CreditCoinGameLogger
 * @dev Contract for logging game results on CreditCoin Testnet
 * Supports Roulette, Mines, Wheel, and Plinko games
 * Pyth Entropy is used for provably fair randomness (backend)
 */
contract CreditCoinGameLogger is Ownable {
    event GameResultLogged(
        bytes32 indexed logId,
        address indexed player,
        GameType gameType,
        uint256 betAmount,
        uint256 payout,
        bytes32 entropyRequestId,
        string entropyTxHash,
        uint256 timestamp
    );

    event NFTMinted(
        bytes32 indexed logId,
        address indexed player,
        uint256 indexed tokenId,
        string nftTxHash,
        string imagePath
    );

    event AuthorizedLoggerAdded(address indexed logger);
    event AuthorizedLoggerRemoved(address indexed logger);

    enum GameType {
        ROULETTE,
        MINES,
        WHEEL,
        PLINKO
    }

    struct GameLog {
        bytes32 logId;
        address player;
        GameType gameType;
        uint256 betAmount;
        bytes resultData;
        uint256 payout;
        bytes32 entropyRequestId;
        string entropyTxHash;
        uint256 timestamp;
        uint256 blockNumber;
        string nftTxHash;
        uint256 nftTokenId;
        string nftImagePath;
    }

    // Mapping from log ID to game log
    mapping(bytes32 => GameLog) public gameLogs;
    
    // Mapping from player to their log IDs
    mapping(address => bytes32[]) public playerLogs;
    
    // Array of all log IDs
    bytes32[] public allLogIds;
    
    // Game type counters for analytics
    mapping(GameType => uint256) public gameTypeCounts;

    // Total stats
    uint256 public totalGamesLogged;
    uint256 public totalBetAmount;
    uint256 public totalPayoutAmount;
    
    // Authorized loggers (treasury and game contracts)
    mapping(address => bool) public authorizedLoggers;

    modifier onlyAuthorized() {
        require(authorizedLoggers[msg.sender] || msg.sender == owner(), "Not authorized to log games");
        _;
    }

    constructor() Ownable(msg.sender) {
        // Owner is authorized by default
        authorizedLoggers[msg.sender] = true;
    }

    /**
     * @dev Log a game result
     * @param gameType Type of game (ROULETTE, MINES, WHEEL, PLINKO)
     * @param betAmount Bet amount in wei (CTC)
     * @param resultData Encoded game result data
     * @param payout Payout amount in wei (CTC)
     * @param entropyRequestId Pyth Entropy request ID
     * @param entropyTxHash Entropy transaction hash for verification
     * @return logId Unique identifier for this game log
     */
    function logGameResult(
        GameType gameType,
        uint256 betAmount,
        bytes memory resultData,
        uint256 payout,
        bytes32 entropyRequestId,
        string memory entropyTxHash
    ) external onlyAuthorized returns (bytes32 logId) {
        // Generate unique log ID
        logId = keccak256(abi.encodePacked(
            msg.sender,
            gameType,
            betAmount,
            block.timestamp,
            block.number,
            allLogIds.length
        ));

        // Store game log
        gameLogs[logId] = GameLog({
            logId: logId,
            player: msg.sender,
            gameType: gameType,
            betAmount: betAmount,
            resultData: resultData,
            payout: payout,
            entropyRequestId: entropyRequestId,
            entropyTxHash: entropyTxHash,
            timestamp: block.timestamp,
            blockNumber: block.number,
            nftTxHash: "",
            nftTokenId: 0,
            nftImagePath: ""
        });

        // Update indexes
        playerLogs[msg.sender].push(logId);
        allLogIds.push(logId);
        
        // Update stats
        gameTypeCounts[gameType]++;
        totalGamesLogged++;
        totalBetAmount += betAmount;
        totalPayoutAmount += payout;

        // Emit event
        emit GameResultLogged(
            logId,
            msg.sender,
            gameType,
            betAmount,
            payout,
            entropyRequestId,
            entropyTxHash,
            block.timestamp
        );

        return logId;
    }

    /**
     * @dev Get game log by ID
     * @param logId Log identifier
     * @return Game log details
     */
    function getGameLog(bytes32 logId) external view returns (GameLog memory) {
        require(gameLogs[logId].player != address(0), "Game log not found");
        return gameLogs[logId];
    }

    /**
     * @dev Get player's game history
     * @param player Player address
     * @param limit Maximum number of logs to return (0 for all)
     * @return Array of log IDs
     */
    function getPlayerHistory(address player, uint256 limit) external view returns (bytes32[] memory) {
        bytes32[] memory logs = playerLogs[player];
        
        if (limit == 0 || limit >= logs.length) {
            return logs;
        }
        
        // Return most recent logs
        bytes32[] memory recentLogs = new bytes32[](limit);
        uint256 startIndex = logs.length - limit;
        
        for (uint256 i = 0; i < limit; i++) {
            recentLogs[i] = logs[startIndex + i];
        }
        
        return recentLogs;
    }


    /**
     * @dev Get logs by game type
     * @param gameType Game type to filter by
     * @param limit Maximum number of logs to return (0 for all)
     * @return Array of log IDs
     */
    function getLogsByGameType(GameType gameType, uint256 limit) external view returns (bytes32[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < allLogIds.length; i++) {
            if (gameLogs[allLogIds[i]].gameType == gameType) {
                count++;
                if (limit > 0 && count >= limit) break;
            }
        }
        
        bytes32[] memory result = new bytes32[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < allLogIds.length && index < count; i++) {
            if (gameLogs[allLogIds[i]].gameType == gameType) {
                result[index] = allLogIds[i];
                index++;
            }
        }
        
        return result;
    }

    /**
     * @dev Get contract statistics
     */
    function getStats() external view returns (
        uint256 totalGames,
        uint256 totalBets,
        uint256 totalPayouts,
        uint256 rouletteCount,
        uint256 minesCount,
        uint256 wheelCount,
        uint256 plinkoCount
    ) {
        return (
            totalGamesLogged,
            totalBetAmount,
            totalPayoutAmount,
            gameTypeCounts[GameType.ROULETTE],
            gameTypeCounts[GameType.MINES],
            gameTypeCounts[GameType.WHEEL],
            gameTypeCounts[GameType.PLINKO]
        );
    }

    /**
     * @dev Add authorized logger (only owner)
     */
    function addAuthorizedLogger(address logger) external onlyOwner {
        require(logger != address(0), "Invalid logger address");
        authorizedLoggers[logger] = true;
        emit AuthorizedLoggerAdded(logger);
    }

    /**
     * @dev Remove authorized logger (only owner)
     */
    function removeAuthorizedLogger(address logger) external onlyOwner {
        authorizedLoggers[logger] = false;
        emit AuthorizedLoggerRemoved(logger);
    }

    /**
     * @dev Check if address is authorized logger
     */
    function isAuthorizedLogger(address logger) external view returns (bool) {
        return authorizedLoggers[logger] || logger == owner();
    }

    /**
     * @dev Get total number of logs
     */
    function getTotalLogs() external view returns (uint256) {
        return allLogIds.length;
    }

    /**
     * @dev Get player's total games
     */
    function getPlayerGameCount(address player) external view returns (uint256) {
        return playerLogs[player].length;
    }

    /**
     * @dev Update game log with NFT information
     * @param logId Log identifier
     * @param nftTxHash Transaction hash of NFT mint
     * @param tokenId NFT token ID
     * @param imagePath Path to NFT image
     */
    function updateNFTInfo(
        bytes32 logId,
        string memory nftTxHash,
        uint256 tokenId,
        string memory imagePath
    ) external onlyAuthorized {
        require(gameLogs[logId].player != address(0), "Game log not found");
        
        gameLogs[logId].nftTxHash = nftTxHash;
        gameLogs[logId].nftTokenId = tokenId;
        gameLogs[logId].nftImagePath = imagePath;

        emit NFTMinted(logId, gameLogs[logId].player, tokenId, nftTxHash, imagePath);
    }
}
