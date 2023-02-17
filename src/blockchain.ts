import CryptoJS from "crypto-js";
import { broadcastLatestBlock } from "./p2p";
import { hexToBinary } from "./util";

// BLOCK

class Block {
  index: number;
  hash: string;
  previousHash: string;
  timestamp: number;
  data: string;
  difficulty: number;
  nonce: number;

  constructor(index: number, hash: string, previousHash: string, timestamp: number, data: string, difficulty: number, nonce: number) {
    this.index = index;
    this.hash = hash;
    this.previousHash = previousHash;
    this.timestamp = timestamp;
    this.data = data;
    this.difficulty = difficulty;
    this.nonce = nonce;
  }
}

function calculateHash(block: Block): string {
  return CryptoJS.SHA256(block.index + block.previousHash + block.timestamp + block.data + block.difficulty + block.nonce).toString();
}

function isBlockValid(newBlock: Block, previousBlock: Block): boolean {
  if (previousBlock.index + 1 !== newBlock.index) {
    console.log("Invalid block index.");
    return false;
  } else if (previousBlock.hash !== newBlock.previousHash) {
    console.log("Invalid block previous hash.");
    return false;
  } else if (calculateHash(newBlock) !== newBlock.hash || !hashMatchesDifficulty(newBlock.hash, newBlock.difficulty)) {
    console.log("Invalid block hash.");
    return false;
  } else if ((previousBlock.timestamp - 60 < newBlock.timestamp) && newBlock.timestamp - 60 < Math.round(new Date().getTime() / 1000)) {
    console.log("Invalid timestamp");
    return false;
  }

  return true;
}

// BLOCKCHAIN

const genesisBlock = new Block(0, "", "", 0, "", 0, 0);

let blockchain: Block[] = [genesisBlock];

function getBlockchain(): Block[] {
  return blockchain;
}

function getLatestBlock(): Block {
  return blockchain[blockchain.length - 1];
}

const BLOCK_GENERATION_INTERVAL = 10;
const DIFFICULTY_ADJUSTMENT_INTERVAL = 10;

function getDifficulty(blockchain: Block[]): number {
  const latestBlock = blockchain[blockchain.length - 1];

  if (latestBlock.index % DIFFICULTY_ADJUSTMENT_INTERVAL === 0 && latestBlock.index !== 0) {
    const prevAdjustmentBlock = blockchain[blockchain.length - DIFFICULTY_ADJUSTMENT_INTERVAL];
    const timeExpected = BLOCK_GENERATION_INTERVAL * DIFFICULTY_ADJUSTMENT_INTERVAL;
    const timeTaken = latestBlock.timestamp - prevAdjustmentBlock.timestamp;

    if (timeTaken < timeExpected / 2) {
      return prevAdjustmentBlock.difficulty + 1;
    } else if (timeTaken > timeExpected * 2) {
      return prevAdjustmentBlock.difficulty - 1;
    } else {
      return prevAdjustmentBlock.difficulty;
    }
  } else {
    return latestBlock.difficulty;
  }
}

function hashMatchesDifficulty(hash: string, difficulty: number): boolean {
  const hashInBinary = hexToBinary(hash);
  const requiredPrefix = "0".repeat(difficulty);

  return hashInBinary.startsWith(requiredPrefix);
}

function mineBlock(data: string) {
  const previousBlock = getLatestBlock();
  const index = previousBlock.index + 1;
  const difficulty = getDifficulty(getBlockchain());
  const timestamp = Math.round(new Date().getTime() / 1000);

  // MINING

  let nonce = 0;
  let newBlock: Block;

  while (true) {
    const hash = CryptoJS.SHA256(index + previousBlock.hash + timestamp + data + difficulty + nonce).toString();

    if (hashMatchesDifficulty(hash, difficulty)) {
      newBlock = new Block(index, hash, previousBlock.hash, timestamp, data, difficulty, nonce);
      break;
    }

    nonce++;
  }

  addBlock(newBlock);
  broadcastLatestBlock();

  return newBlock;
}

function addBlock(newBlock: Block): boolean {
  if (isBlockValid(newBlock, getLatestBlock())) {
    blockchain.push(newBlock);
    return true;
  }

  return false;
}

function isBlockchainValid(blockchain: Block[]): boolean {
  if (JSON.stringify(blockchain[0]) !== JSON.stringify(genesisBlock)) {
    console.log("Invalid genesis block.");
    return false;
  }

  for (let i = 1; i < blockchain.length; i++) {
    if (!isBlockValid(blockchain[i], blockchain[i - 1])) {
      return false;
    }
  }

  return true;
}

function replaceBlockchain(newBlockchain: Block[]) {
  if (isBlockchainValid(newBlockchain) && newBlockchain.length > getBlockchain().length) {
    console.log("Received blockchain is valid. Replacing the current one...");
    blockchain = newBlockchain;
    broadcastLatestBlock();
  } else {
    console.log("Received blockchain is invalid.");
  }
}

export { getBlockchain, getLatestBlock, mineBlock, Block, isBlockValid, addBlock, replaceBlockchain };
