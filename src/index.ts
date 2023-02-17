import { runHttpServer } from "./http";
import { runP2PServer } from "./p2p";

const httpPort = parseInt(process.env.HTTP_PORT) || 3000;
const p2pPort = parseInt(process.env.P2P_PORT) || 8000;

runHttpServer(httpPort);
runP2PServer(p2pPort);
