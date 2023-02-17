import WebSocket from "ws";
import { getLatestBlock, getBlockchain, Block, isBlockValid, addBlock, replaceBlockchain } from "./blockchain";

enum MessageType {
  QUERY_LATEST = 0,
  QUERY_ALL = 1,
  RESPONSE_BLOCKCHAIN = 2,
}

class Message {
  type: MessageType;
  data: any;

  constructor(type: MessageType, data: any) {
    this.type = type;
    this.data = data;
  }
}

let sockets: WebSocket[] = [];

function getSockets(): WebSocket[] {
  return sockets;
}

function runP2PServer(port: number): void {
  const server = new WebSocket.Server({port: port});

  server.on("connection", (socket) => {
    handleConnection(socket);
  });

  console.log("P2P server started on port:", port);
}

function send(socket: WebSocket, message: Message): void {
  socket.send(JSON.stringify(message));
}

function broadcast(message: Message): void {
  sockets.forEach((socket) => send(socket, message));
}

function broadcastLatestBlock(): void {
  broadcast(new Message(MessageType.RESPONSE_BLOCKCHAIN, JSON.stringify([getLatestBlock()])));
}

function closeConnection(socket: WebSocket) {
  console.log("Connection closed with peer:", socket.url);
  sockets.splice(sockets.indexOf(socket), 1);
}

function handleConnection(socket: WebSocket) {
  sockets.push(socket);

  socket.on("close", () => closeConnection(socket));
  socket.on("error", () => closeConnection(socket));

  socket.on("message", (data: string) => {
    const message: Message = JSON.parse(data);

    if (message === null) {
      console.log("Error parsing message.");
      return;
    }

    console.log("Received message:", JSON.stringify(message));

    switch(message.type) {
      case MessageType.QUERY_LATEST:
        send(socket, new Message(MessageType.RESPONSE_BLOCKCHAIN, JSON.stringify([getLatestBlock()])));
        break;
      case MessageType.QUERY_ALL:
        send(socket, new Message(MessageType.RESPONSE_BLOCKCHAIN, JSON.stringify(getBlockchain())));
        break;
      case MessageType.RESPONSE_BLOCKCHAIN:
        const receivedBlockchain: Block[] = JSON.parse(message.data);

        if (receivedBlockchain === null) {
          console.log("Received invalid blockchain:", message.data);
          break;
        }

        handleReceivedBlockchain(receivedBlockchain);
        break;
    }
  });

  send(socket, new Message(MessageType.QUERY_LATEST, null));
}

function handleReceivedBlockchain(receivedBlockchain: Block[]) {
  if (receivedBlockchain.length === 0) {
    console.log("Received blockchain of size 0.");
    return;
  }

  const latestReceivedBlock = receivedBlockchain[receivedBlockchain.length - 1];
  const latestBlock = getLatestBlock();

  if (latestReceivedBlock.index > latestBlock.index) {
    console.log("Local blockchain possibly behind...");

    if (latestBlock.hash === latestReceivedBlock.previousHash) {
      if (addBlock(latestReceivedBlock)) {
        broadcastLatestBlock();
        console.log("Added block");
      }
    } else if (receivedBlockchain.length === 1) {
      console.log("We have to query entire blockchain from our peer.");
      broadcast(new Message(MessageType.QUERY_ALL, null));
    } else {
      console.log("Received chain is longer than the local one.");
      replaceBlockchain(receivedBlockchain);
    }
  } else {
    console.log("Received blockchain is shorter or the same length.");
  }
}

function connectToPeer(address: string): void {
  const socket = new WebSocket(address);

  socket.on("open", () => {
    handleConnection(socket);
    console.log("Successfully connected to peer!");
  });

  socket.on("error", () => {
    console.log("Connection to peer failed.");
  });
}

export { getSockets, runP2PServer, broadcastLatestBlock, connectToPeer };
