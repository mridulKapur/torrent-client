import tracker from './tracker.js'
import message from './message.js'
import net from 'net';
import {Buffer} from 'buffer'
import fs from "fs"

import Pieces from './Pieces.js'
import Queue from './Queue.js'

export const download = (torrent,path) => {
  tracker.getPeers(torrent, (peers) => {
    const pieces = new Pieces(torrent)
    const file = fs.openSync(path, 'w');
    peers.forEach(peer => downloadPeer(peer,torrent,pieces,file));
  })
}

const onWholeMessage = (socket, callback ) => {
  var savedBuf = Buffer.alloc(0);
  var handshake = true;

  socket.on('data', recvBuf => {
    const msgLen = () => handshake ? savedBuf.readUInt(8) + 49 : savedBuf.readInt32BE(0) + 4;
    savedBuf = Buffer.concat([savedBuf, recvBuf])
    
    while (savedBuf.length >= 4 && savedBuf.length >= msgLen()) {
      callback(savedBuf.slice(0, msgLen()))
      savedBuf = savedBuf.slice(msgLen())
      handshake = false;
    }
  })
}

const downloadPeer = (peer,torrent,pieces) => { 
  const socket = net.Socket();
  socket.on('error', console.log);
  socket.connect(peer.port, peer.ip, () => {
    socket.write(message.buildHandshake(torrent))
  })
  const queue = new Queue(torrent);
  onWholeMessage(socket, msg => msgHandler(msg, socket,pieces,queue))
}

const msgHandler = (msg, socket,pieces,queue) => {
  if (isHandshake(msg)) {
    socket.write(message.buildInterested())
  } else {
    const m = message.parse(msg)

    if (m.id === 0) chokehandler(socket);
    if (m.id === 1) unchokeHandler(socket,pieces,queue);
    if (m.id === 4) haveHandler(socket, pieces, queue, m.payload);
    if (m.id === 5) bitfieldHandler(socket, pieces, queue, m.payload);
    if (m.id === 7) pieceHandler(m.payload,pieces,queue);
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

function pieceHandler(socket, pieces, queue, torrent, pieceResp) {
  console.log(pieceResp);
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
  while (queue.length()) {
    const pieceBlock = queue.deque();
    if (pieces.needed(pieceIndex)) {
      socket.write(message.buildRequest(pieceIndex))
      pieces.addRequest(pieceIndex)
      break;
    }
  }
}

const isHandshake = (msg) => {
  return msg.length === msg.readUInt8(0) + 49 && msg.toString('utf8', 1) === 'BitTorrent protocol';
}