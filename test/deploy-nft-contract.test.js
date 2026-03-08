const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("APTCasinoNFT Deployment and Testing", function () {
  let nftContract;
  let deployer;
  let treasuryWallet;
  let player;
  let baseURI;

  before(async function () {
    // Get signers
    [deployer, treasuryWallet, player] = await ethers.getSigners();
    
    // Set base URI
    baseURI = "https://aptcasino.com/nft/";
    
    // Deploy the contract
    const APTCasinoNFT = await ethers.getContractFactory("APTCasinoNFT");
    nftContract = await APTCasinoNFT.deploy(baseURI);
    await nftContract.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      const address = await nftContract.getAddress();
      expect(address).to.be.properAddress;
    });

    it("Should set deployer as owner", async function () {
      const owner = await nftContract.owner();
      expect(owner).to.equal(deployer.address);
    });

    it("Should set deployer as authorized minter", async function () {
      const isAuthorized = await nftContract.authorizedMinters(deployer.address);
      expect(isAuthorized).to.be.true;
    });

    it("Should have correct name and symbol", async function () {
      const name = await nftContract.name();
      const symbol = await nftContract.symbol();
      expect(name).to.equal("APT Casino Game");
      expect(symbol).to.equal("APTGAME");
    });

    it("Should have initial total supply of 0", async function () {
      const totalSupply = await nftContract.totalSupply();
      expect(totalSupply).to.equal(0);
    });
  });

  describe("Minter Authorization", function () {
    it("Should allow owner to authorize minter", async function () {
      const tx = await nftContract.authorizeMinter(treasuryWallet.address);
      await tx.wait();
      
      const isAuthorized = await nftContract.authorizedMinters(treasuryWallet.address);
      expect(isAuthorized).to.be.true;
    });

    it("Should emit MinterAuthorized event", async function () {
      const newMinter = player.address;
      await expect(nftContract.authorizeMinter(newMinter))
        .to.emit(nftContract, "MinterAuthorized")
        .withArgs(newMinter);
    });

    it("Should revert when authorizing zero address", async function () {
      await expect(
        nftContract.authorizeMinter(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid minter address");
    });

    it("Should allow owner to revoke minter", async function () {
      await nftContract.authorizeMinter(player.address);
      
      const tx = await nftContract.revokeMinter(player.address);
      await tx.wait();
      
      const isAuthorized = await nftContract.authorizedMinters(player.address);
      expect(isAuthorized).to.be.false;
    });

    it("Should emit MinterRevoked event", async function () {
      await nftContract.authorizeMinter(player.address);
      
      await expect(nftContract.revokeMinter(player.address))
        .to.emit(nftContract, "MinterRevoked")
        .withArgs(player.address);
    });

    it("Should revert when non-owner tries to authorize minter", async function () {
      await expect(
        nftContract.connect(player).authorizeMinter(player.address)
      ).to.be.revertedWithCustomError(nftContract, "OwnableUnauthorizedAccount");
    });
  });

  describe("NFT Minting", function () {
    let tokenId;
    const gameType = "ROULETTE";
    const betAmount = ethers.parseEther("0.1");
    const result = JSON.stringify({ number: 7, color: "red" });
    const payout = ethers.parseEther("0.2");
    const timestamp = Math.floor(Date.now() / 1000);
    const logId = ethers.keccak256(ethers.toUtf8Bytes("test_log_1"));

    it("Should allow authorized minter to mint NFT", async function () {
      const tx = await nftContract.mintGameNFT(
        player.address,
        gameType,
        betAmount,
        result,
        payout,
        timestamp,
        logId
      );
      
      const receipt = await tx.wait();
      expect(receipt).to.not.be.null;
      
      // Extract token ID from event
      const event = receipt.logs.find(log => {
        try {
          const parsed = nftContract.interface.parseLog(log);
          return parsed.name === 'NFTMinted';
        } catch (e) {
          return false;
        }
      });
      
      expect(event).to.not.be.undefined;
      const parsedEvent = nftContract.interface.parseLog(event);
      tokenId = parsedEvent.args.tokenId;
      expect(tokenId).to.equal(1);
    });

    it("Should emit NFTMinted event with correct data", async function () {
      const logId2 = ethers.keccak256(ethers.toUtf8Bytes("test_log_2"));
      
      await expect(
        nftContract.mintGameNFT(
          player.address,
          gameType,
          betAmount,
          result,
          payout,
          timestamp,
          logId2
        )
      ).to.emit(nftContract, "NFTMinted")
        .withArgs(2, player.address, logId2, gameType);
    });

    it("Should assign sequential token IDs", async function () {
      const logId3 = ethers.keccak256(ethers.toUtf8Bytes("test_log_3"));
      const logId4 = ethers.keccak256(ethers.toUtf8Bytes("test_log_4"));
      
      const tx1 = await nftContract.mintGameNFT(
        player.address, gameType, betAmount, result, payout, timestamp, logId3
      );
      const receipt1 = await tx1.wait();
      const event1 = receipt1.logs.find(log => {
        try {
          return nftContract.interface.parseLog(log).name === 'NFTMinted';
        } catch (e) {
          return false;
        }
      });
      const tokenId1 = nftContract.interface.parseLog(event1).args.tokenId;
      
      const tx2 = await nftContract.mintGameNFT(
        player.address, gameType, betAmount, result, payout, timestamp, logId4
      );
      const receipt2 = await tx2.wait();
      const event2 = receipt2.logs.find(log => {
        try {
          return nftContract.interface.parseLog(log).name === 'NFTMinted';
        } catch (e) {
          return false;
        }
      });
      const tokenId2 = nftContract.interface.parseLog(event2).args.tokenId;
      
      expect(tokenId2).to.equal(tokenId1 + 1n);
    });

    it("Should store metadata correctly", async function () {
      const metadata = await nftContract.getTokenMetadata(1);
      
      expect(metadata.gameType).to.equal(gameType);
      expect(metadata.betAmount).to.equal(betAmount);
      expect(metadata.result).to.equal(result);
      expect(metadata.payout).to.equal(payout);
      expect(metadata.timestamp).to.equal(timestamp);
      expect(metadata.logId).to.equal(logId);
    });

    it("Should revert when unauthorized address tries to mint", async function () {
      const unauthorizedUser = player;
      const logId5 = ethers.keccak256(ethers.toUtf8Bytes("test_log_5"));
      
      await expect(
        nftContract.connect(unauthorizedUser).mintGameNFT(
          player.address,
          gameType,
          betAmount,
          result,
          payout,
          timestamp,
          logId5
        )
      ).to.be.revertedWith("Not authorized to mint");
    });

    it("Should allow owner to mint even without explicit authorization", async function () {
      const logId6 = ethers.keccak256(ethers.toUtf8Bytes("test_log_6"));
      
      const tx = await nftContract.connect(deployer).mintGameNFT(
        player.address,
        gameType,
        betAmount,
        result,
        payout,
        timestamp,
        logId6
      );
      
      const receipt = await tx.wait();
      expect(receipt).to.not.be.null;
    });
  });

  describe("Token Queries", function () {
    it("Should return correct token URI", async function () {
      const tokenURI = await nftContract.tokenURI(1);
      expect(tokenURI).to.equal(baseURI + "1");
    });

    it("Should revert when querying non-existent token URI", async function () {
      await expect(
        nftContract.tokenURI(999999)
      ).to.be.revertedWith("Token does not exist");
    });

    it("Should revert when querying metadata for non-existent token", async function () {
      await expect(
        nftContract.getTokenMetadata(999999)
      ).to.be.revertedWith("Token does not exist");
    });

    it("Should return correct owner balance", async function () {
      const balance = await nftContract.balanceOf(player.address);
      expect(balance).to.be.greaterThan(0);
    });

    it("Should return all tokens owned by address", async function () {
      const tokens = await nftContract.getTokensByOwner(player.address);
      expect(tokens.length).to.be.greaterThan(0);
      expect(tokens[0]).to.equal(1);
    });

    it("Should return correct total supply", async function () {
      const totalSupply = await nftContract.totalSupply();
      expect(totalSupply).to.be.greaterThan(0);
    });
  });

  describe("Base URI Management", function () {
    it("Should allow owner to update base URI", async function () {
      const newBaseURI = "https://newuri.com/nft/";
      
      const tx = await nftContract.setBaseURI(newBaseURI);
      await tx.wait();
      
      // Verify by checking token URI
      const tokenURI = await nftContract.tokenURI(1);
      expect(tokenURI).to.equal(newBaseURI + "1");
    });

    it("Should emit BaseURIUpdated event", async function () {
      const newBaseURI = "https://another.com/nft/";
      
      await expect(nftContract.setBaseURI(newBaseURI))
        .to.emit(nftContract, "BaseURIUpdated")
        .withArgs(newBaseURI);
    });

    it("Should revert when non-owner tries to update base URI", async function () {
      await expect(
        nftContract.connect(player).setBaseURI("https://hack.com/")
      ).to.be.revertedWithCustomError(nftContract, "OwnableUnauthorizedAccount");
    });
  });

  describe("ERC-721 Compliance", function () {
    it("Should support ERC-721 interface", async function () {
      // ERC-721 interface ID: 0x80ac58cd
      const supportsERC721 = await nftContract.supportsInterface("0x80ac58cd");
      expect(supportsERC721).to.be.true;
    });

    it("Should support ERC-721 Enumerable interface", async function () {
      // ERC-721 Enumerable interface ID: 0x780e9d63
      const supportsEnumerable = await nftContract.supportsInterface("0x780e9d63");
      expect(supportsEnumerable).to.be.true;
    });

    it("Should support ERC-721 Metadata interface", async function () {
      // ERC-721 Metadata interface ID: 0x5b5e139f
      const supportsMetadata = await nftContract.supportsInterface("0x5b5e139f");
      expect(supportsMetadata).to.be.true;
    });

    it("Should allow token transfers", async function () {
      // Mint a new token to deployer
      const logId = ethers.keccak256(ethers.toUtf8Bytes("transfer_test"));
      const tx = await nftContract.mintGameNFT(
        deployer.address,
        "MINES",
        ethers.parseEther("0.05"),
        "{}",
        ethers.parseEther("0.1"),
        Math.floor(Date.now() / 1000),
        logId
      );
      await tx.wait();
      
      const totalSupply = await nftContract.totalSupply();
      const newTokenId = totalSupply;
      
      // Transfer to player
      await nftContract.transferFrom(deployer.address, player.address, newTokenId);
      
      // Verify new owner
      const newOwner = await nftContract.ownerOf(newTokenId);
      expect(newOwner).to.equal(player.address);
    });
  });
});
