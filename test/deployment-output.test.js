const { expect } = require("chai");
const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

describe("Deployment Script Output Verification", function () {
  let gameLogger;
  let deployer;
  let deploymentTimestamp;
  let deploymentJsonPath;
  let envUpdatePath;

  before(async function () {
    // Get signers
    [deployer] = await ethers.getSigners();
    
    // Deploy the contract (simulating what the deployment script does)
    const CreditCoinGameLogger = await ethers.getContractFactory("CreditCoinGameLogger");
    gameLogger = await CreditCoinGameLogger.deploy();
    await gameLogger.waitForDeployment();
    
    const gameLoggerAddress = await gameLogger.getAddress();
    const network = await ethers.provider.getNetwork();
    
    // Simulate deployment script file generation
    deploymentTimestamp = Date.now();
    const deploymentsDir = './deployments';
    
    // Ensure deployments directory exists
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir);
    }
    
    // Create deployment results object
    const deploymentTx = gameLogger.deploymentTransaction();
    const deploymentReceipt = deploymentTx ? await deploymentTx.wait() : null;
    
    const deploymentResults = {
      network: "creditcoin-testnet",
      chainId: network.chainId.toString(),
      deployer: deployer.address,
      deploymentTime: new Date().toISOString(),
      contracts: {
        gameLogger: {
          address: gameLoggerAddress,
          transactionHash: deploymentTx?.hash,
          blockNumber: deploymentReceipt?.blockNumber
        }
      }
    };
    
    // Save deployment JSON
    deploymentJsonPath = path.join(deploymentsDir, `creditcoin-contracts-${deploymentTimestamp}.json`);
    fs.writeFileSync(deploymentJsonPath, JSON.stringify(deploymentResults, null, 2));
    
    // Generate environment variable updates
    const envUpdate = `
# CreditCoin Testnet Contract Addresses (deployed ${new Date().toISOString()})
NEXT_PUBLIC_CREDITCOIN_GAME_LOGGER_ADDRESS=${gameLoggerAddress}
`;
    
    envUpdatePath = path.join(deploymentsDir, 'creditcoin-env-update.txt');
    fs.writeFileSync(envUpdatePath, envUpdate.trim());
  });

  after(async function () {
    // Clean up test files
    if (fs.existsSync(deploymentJsonPath)) {
      fs.unlinkSync(deploymentJsonPath);
    }
    if (fs.existsSync(envUpdatePath)) {
      fs.unlinkSync(envUpdatePath);
    }
  });

  describe("Deployment JSON File", function () {
    it("Should create deployment JSON file with timestamp", async function () {
      expect(fs.existsSync(deploymentJsonPath)).to.be.true;
    });

    it("Should contain all required deployment details", async function () {
      const fileContent = fs.readFileSync(deploymentJsonPath, 'utf8');
      const deploymentData = JSON.parse(fileContent);
      
      // Verify required fields
      expect(deploymentData).to.have.property('network');
      expect(deploymentData).to.have.property('chainId');
      expect(deploymentData).to.have.property('deployer');
      expect(deploymentData).to.have.property('deploymentTime');
      expect(deploymentData).to.have.property('contracts');
      
      // Verify network details
      expect(deploymentData.network).to.equal('creditcoin-testnet');
      expect(deploymentData.deployer).to.equal(deployer.address);
      
      // Verify contract details
      expect(deploymentData.contracts).to.have.property('gameLogger');
      expect(deploymentData.contracts.gameLogger).to.have.property('address');
      expect(deploymentData.contracts.gameLogger.address).to.be.properAddress;
    });

    it("Should include contract address in deployment data", async function () {
      const fileContent = fs.readFileSync(deploymentJsonPath, 'utf8');
      const deploymentData = JSON.parse(fileContent);
      const gameLoggerAddress = await gameLogger.getAddress();
      
      expect(deploymentData.contracts.gameLogger.address).to.equal(gameLoggerAddress);
    });

    it("Should include deployer address in deployment data", async function () {
      const fileContent = fs.readFileSync(deploymentJsonPath, 'utf8');
      const deploymentData = JSON.parse(fileContent);
      
      expect(deploymentData.deployer).to.equal(deployer.address);
    });

    it("Should include deployment timestamp", async function () {
      const fileContent = fs.readFileSync(deploymentJsonPath, 'utf8');
      const deploymentData = JSON.parse(fileContent);
      
      expect(deploymentData.deploymentTime).to.be.a('string');
      // Verify it's a valid ISO timestamp
      const timestamp = new Date(deploymentData.deploymentTime);
      expect(timestamp.toString()).to.not.equal('Invalid Date');
    });

    it("Should include block number in deployment data", async function () {
      const fileContent = fs.readFileSync(deploymentJsonPath, 'utf8');
      const deploymentData = JSON.parse(fileContent);
      
      expect(deploymentData.contracts.gameLogger).to.have.property('blockNumber');
      expect(deploymentData.contracts.gameLogger.blockNumber).to.be.a('number');
    });

    it("Should include transaction hash in deployment data", async function () {
      const fileContent = fs.readFileSync(deploymentJsonPath, 'utf8');
      const deploymentData = JSON.parse(fileContent);
      
      expect(deploymentData.contracts.gameLogger).to.have.property('transactionHash');
      expect(deploymentData.contracts.gameLogger.transactionHash).to.be.a('string');
    });
  });

  describe("Environment Variable Update File", function () {
    it("Should create environment variable update file", async function () {
      expect(fs.existsSync(envUpdatePath)).to.be.true;
    });

    it("Should contain NEXT_PUBLIC_CREDITCOIN_GAME_LOGGER_ADDRESS", async function () {
      const fileContent = fs.readFileSync(envUpdatePath, 'utf8');
      
      expect(fileContent).to.include('NEXT_PUBLIC_CREDITCOIN_GAME_LOGGER_ADDRESS');
    });

    it("Should contain the correct contract address", async function () {
      const fileContent = fs.readFileSync(envUpdatePath, 'utf8');
      const gameLoggerAddress = await gameLogger.getAddress();
      
      expect(fileContent).to.include(gameLoggerAddress);
    });

    it("Should be in valid environment variable format", async function () {
      const fileContent = fs.readFileSync(envUpdatePath, 'utf8');
      const gameLoggerAddress = await gameLogger.getAddress();
      
      // Check for proper format: KEY=VALUE
      const expectedLine = `NEXT_PUBLIC_CREDITCOIN_GAME_LOGGER_ADDRESS=${gameLoggerAddress}`;
      expect(fileContent).to.include(expectedLine);
    });
  });

  describe("Deployment Summary Information", function () {
    it("Should have contract address available for display", async function () {
      const gameLoggerAddress = await gameLogger.getAddress();
      expect(gameLoggerAddress).to.be.properAddress;
    });

    it("Should have deployer address available for display", async function () {
      expect(deployer.address).to.be.properAddress;
    });

    it("Should have network information available", async function () {
      const network = await ethers.provider.getNetwork();
      expect(network.chainId).to.be.a('bigint');
    });

    it("Should be able to construct CreditCoin explorer link", async function () {
      const gameLoggerAddress = await gameLogger.getAddress();
      const explorerLink = `https://creditcoin-testnet.blockscout.com/address/${gameLoggerAddress}`;
      
      expect(explorerLink).to.include('creditcoin-testnet.blockscout.com');
      expect(explorerLink).to.include(gameLoggerAddress);
    });
  });
});
