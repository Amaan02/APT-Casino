// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title APTCasinoNFT
 * @dev ERC-721 NFT contract for APT Casino game collectibles
 * Each NFT represents a game played on APT Casino with metadata including
 * game type, bet amount, result, payout, timestamp, and reference to game log
 */
contract APTCasinoNFT is ERC721, ERC721Enumerable, Ownable {
    
    struct GameMetadata {
        string gameType;      // "ROULETTE", "MINES", "WHEEL", "PLINKO"
        uint256 betAmount;    // Bet amount in wei
        string result;        // Game result (encoded as string)
        uint256 payout;       // Payout amount in wei
        uint256 timestamp;    // Game timestamp
        bytes32 logId;        // Reference to GameLogger logId
    }
    
    // Token ID => Metadata
    mapping(uint256 => GameMetadata) public tokenMetadata;
    
    // Authorized minters
    mapping(address => bool) public authorizedMinters;
    
    // Base URI for token metadata
    string private _baseTokenURI;
    
    // Token counter
    uint256 private _nextTokenId = 1;
    
    event NFTMinted(
        uint256 indexed tokenId,
        address indexed recipient,
        bytes32 indexed logId,
        string gameType
    );
    
    event MinterAuthorized(address indexed minter);
    event MinterRevoked(address indexed minter);
    event BaseURIUpdated(string newBaseURI);
    
    constructor(string memory baseURI) ERC721("APT Casino Game", "APTGAME") Ownable(msg.sender) {
        _baseTokenURI = baseURI;
        authorizedMinters[msg.sender] = true;
    }
    
    modifier onlyMinter() {
        require(authorizedMinters[msg.sender] || msg.sender == owner(), "Not authorized to mint");
        _;
    }
    
    /**
     * @dev Mint a new game NFT
     * @param recipient Address to receive the NFT
     * @param gameType Type of game played
     * @param betAmount Bet amount in wei
     * @param result Game result data (encoded as string)
     * @param payout Payout amount in wei
     * @param timestamp Game timestamp
     * @param logId Reference to game logger log ID
     * @return tokenId The ID of the newly minted token
     */
    function mintGameNFT(
        address recipient,
        string memory gameType,
        uint256 betAmount,
        string memory result,
        uint256 payout,
        uint256 timestamp,
        bytes32 logId
    ) external onlyMinter returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        
        _safeMint(recipient, tokenId);
        
        tokenMetadata[tokenId] = GameMetadata({
            gameType: gameType,
            betAmount: betAmount,
            result: result,
            payout: payout,
            timestamp: timestamp,
            logId: logId
        });
        
        emit NFTMinted(tokenId, recipient, logId, gameType);
        
        return tokenId;
    }
    
    /**
     * @dev Authorize an address to mint NFTs
     * @param minter Address to authorize
     */
    function authorizeMinter(address minter) external onlyOwner {
        require(minter != address(0), "Invalid minter address");
        authorizedMinters[minter] = true;
        emit MinterAuthorized(minter);
    }
    
    /**
     * @dev Revoke minting authorization from an address
     * @param minter Address to revoke
     */
    function revokeMinter(address minter) external onlyOwner {
        authorizedMinters[minter] = false;
        emit MinterRevoked(minter);
    }
    
    /**
     * @dev Update the base URI for token metadata
     * @param baseURI New base URI
     */
    function setBaseURI(string memory baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
        emit BaseURIUpdated(baseURI);
    }
    
    /**
     * @dev Get metadata for a specific token
     * @param tokenId Token ID to query
     * @return GameMetadata struct containing game information
     */
    function getTokenMetadata(uint256 tokenId) external view returns (GameMetadata memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return tokenMetadata[tokenId];
    }
    
    /**
     * @dev Get all token IDs owned by an address
     * @param owner Address to query
     * @return Array of token IDs
     */
    function getTokensByOwner(address owner) external view returns (uint256[] memory) {
        uint256 balance = balanceOf(owner);
        uint256[] memory tokens = new uint256[](balance);
        
        for (uint256 i = 0; i < balance; i++) {
            tokens[i] = tokenOfOwnerByIndex(owner, i);
        }
        
        return tokens;
    }
    
    /**
     * @dev Returns the token URI for a given token ID
     * @param tokenId Token ID to query
     * @return Token URI string
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return string(abi.encodePacked(_baseTokenURI, Strings.toString(tokenId)));
    }
    
    // Required overrides for ERC721Enumerable
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
