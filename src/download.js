import tracker from './tracker.js'
import message from './message.js'
import net from 'net';
import {Buffer} from 'buffer'
import fs from "fs"

import Pieces from './Pieces.js'
import Queue from './Queue.js'

export const download = (torrent, path) => {
  // console.log(torrent.info.files)
  tracker.getPeers(torrent, (peers) => {
    // console.log(peers)
    const pieces = new Pieces(torrent)
    const file = fs.openSync(path, 'w');
    peers.forEach(peer => downloadPeer(peer,torrent,pieces,file));
  })
}

const onWholeMessage = (socket, callback) => {
  // console.log("21");
  var savedBuf = Buffer.alloc(0);
  var handshake = true;

  socket.on('data', recvBuf => {
    // console.log("26")
    const msgLen = () => handshake ? savedBuf.readUInt8(0) + 49 : savedBuf.readInt32BE(0) + 4;
    savedBuf = Buffer.concat([savedBuf, recvBuf])
    
    while (savedBuf.length >= 4 && savedBuf.length >= msgLen()) {
      callback(savedBuf.slice(0, msgLen()))
      savedBuf = savedBuf.slice(msgLen())
      handshake = false;
    }
  })
}

const downloadPeer = (peer, torrent, pieces,file) => { 
  // console.log(peer)
  const socket = net.Socket();
  socket.on('error', console.log);
  socket.connect(peer.port, peer.ip, () => {
    socket.write(message.buildHandshake(torrent))
  })
  const queue = new Queue(torrent);
  onWholeMessage(socket, msg => msgHandler(msg, socket,pieces,torrent,queue,file))
}

const msgHandler = (msg, socket, pieces,torrent, queue,file) => {
  // console.log("49")
  if (isHandshake(msg)) {
    socket.write(message.buildInterested())
  } else {
    const m = message.parse(msg)
    // console.log(m)
    if (m.id === 0) chokehandler(socket);
    if (m.id === 1) unchokeHandler(socket,pieces,queue);
    if (m.id === 4) haveHandler(socket, pieces, queue, m.payload);
    if (m.id === 5) bitfieldHandler(socket, pieces, queue, m.payload);
    if (m.id === 7) pieceHandler(socket,pieces,queue,torrent, file, m.payload);
  }
}

const chokehandler = (socket) => {
  socket.end();
}

const unchokeHandler = (socket , pieces,queue) => {
  queue.choked = false;
  requestPiece(socket,pieces,queue)
}

const haveHandler = (socket,payload,queue,pieces) => {
  const pieceIndex = payload.readUInt32BE(0);
  const queueEmpty = queue.length === 0;
  queue.queue(pieceIndex);
  if (queueEmpty) requestPiece(socket, pieces, queue);
}

const bitfieldHandler = (socket, pieces, queue, payload) => {
  const queueEmpty = queue.length === 0;
  payload.forEach((byte, i) => {
    for (let j = 0; j < 8; j++) {
      if (byte % 2) queue.queue(i * 8 + 7 - j);
      byte = Math.floor(byte / 2);
    }
  });
  if (queueEmpty) requestPiece(socket, pieces, queue);
}

function pieceHandler(socket, pieces, queue, torrent,file, pieceResp) {
  pieces.printPercentDone();
  // console.log(pieceResp);
  pieces.addReceived(pieceResp);

  const offset = pieceResp.index * torrent.info['piece length'] + pieceResp.begin;
  fs.write(file, pieceResp.block, 0, pieceResp.block.length, offset, () => {});

  if (pieces.isDone()) {
    console.log('DONE!');
    socket.end();
    try { fs.closeSync(file); } catch(e) {}
  } else {
    requestPiece(socket,pieces, queue);
  }
}  

const requestPiece = (socket, pieces, queue)=>{
  if (queue.choked) return null
  // console.log(pieces);
  while (queue.length()) {
    const pieceBlock = queue.deque();
    if (pieces.needed(pieceBlock)) {
      socket.write(message.buildRequest(pieceBlock))
      pieces.addRequested(pieceBlock)
      break;
    }
  }
}

const isHandshake = (msg) => {
  return msg.length === msg.readUInt8(0) + 49 && msg.toString('utf8', 1) === 'BitTorrent protocol';
}