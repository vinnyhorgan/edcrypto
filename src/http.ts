import express from "express";
import { getBlockchain, mineBlock } from "./blockchain";
import { connectToPeer, getSockets } from "./p2p";

function runHttpServer(port: number): void {
  const app = express();

  app.use(express.json());

  app.get("/blocks", (req, res) => {
    res.send(getBlockchain());
  });

  app.get("/mine", (req, res) => {
    const newBlock = mineBlock("");
    res.send(newBlock);
  });

  app.get("/peers", (req, res) => {
    res.send(getSockets().map((s: any) => s._socket.remoteAddress + ':' + s._socket.remotePort));
  });

  app.post("/addPeer", (req, res) => {
    connectToPeer(req.body.peer);
    res.send();
  });

  app.listen(port, () => {
    console.log("Http server started on port:", port);
  });
}

export { runHttpServer };
