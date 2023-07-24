'use strict';

import {parse} from 'url';
import dgram from 'dgram'
import { Buffer } from 'buffer'
import crypto from 'crypto';
import torrentParser from './torrent-parser.js';
import util from './util.js'

const getPeers = (torrent, callback) => {
  const socket = dgram.createSocket('udp4')
  const url = torrent['announce-list'][2].toString("utf-8");
  // console.log(url)
  udpSend(socket,buildConnReq(),url)
  
  socket.on('message', response => {
    // console.log(response)
    if (respType(response) === 'connect') {
      const connResp = parseConnResp(response)
      const announceReq = buildAnnounceReq(connResp.connectionId, torrent)
      // console.log(announceReq)
      udpSend(socket, announceReq, url)
    } else if (respType(response) === 'announce') {
      // console.log(response);
      const announceResp = parseAnnounceResp(response)
      // console.log(response);
      callback(announceResp.peers)
    }
  })
}

function udpSend(socket, message, rawUrl, callback = () => {}) {
  const url = parse(rawUrl);
  // console.log("35", url);
  socket.send(message, 0, message.length, url.port, url.hostname, callback);
  
}

const respType = (resp)  => {
  if (resp.readUInt32BE(0) === 0) {
    return 'connect'
  } else if(resp.readUInt32BE(0) === 1) {
    return 'announce'
  }
}

function buildConnReq() {
  const buf = Buffer.allocUnsafe(16);

  buf.writeUInt32BE(0x417, 0);
  buf.writeUInt32BE(0x27101980, 4);
  buf.writeUInt32BE(0, 8);
  crypto.randomBytes(4).copy(buf, 12);

  return buf;
}

const parseConnResp = (resp) => {
  return {
    action: resp.readUInt32BE(0),
    transactionId: resp.readUInt32BE(4),
    connectionId: resp.slice(8)
  }
}

const buildAnnounceReq = (connId,torrent,port=6881) => {
  const buf = Buffer.allocUnsafe(98);

  // connection id
  connId.copy(buf, 0);
  // action
  buf.writeUInt32BE(1, 8);
  // transaction id
  crypto.randomBytes(4).copy(buf, 12);
  // info hash
  torrentParser.infoHash(torrent).copy(buf, 16);
  // peerId
  util.genId().copy(buf, 36);
  // downloaded
  Buffer.alloc(8).copy(buf, 56);
  // left
  torrentParser.sizeLeft(torrent).copy(buf, 64);
  // uploaded
  Buffer.alloc(8).copy(buf, 72);
  // event
  buf.writeUInt32BE(0, 80);
  // ip address
  buf.writeUInt32BE(0, 80);
  // key
  crypto.randomBytes(4).copy(buf, 88);
  // num want
  buf.writeInt32BE(-1, 92);
  // port
  buf.writeUInt16BE(port, 96);

  return buf;
}

const parseAnnounceResp = (resp) => {
  const group = (iterable, size) => {
    var groups = [];
    for (let i = 0; i < iterable.length; i += size) {
      groups.push(iterable.slice(i, i + size));
    }
    return groups;
  }

  return {
    action: resp.readUInt32BE(0),
    transactionId: resp.readUInt32BE(4),
    leechers: resp.readUInt32BE(8),
    seeders: resp.readUInt32BE(12),
    peers: group(resp.slice(20), 6).map(address => {
      return {
        ip: address.slice(0, 4).join('.'),
        port: address.readUInt16BE(4)
      }
    })
  }
}

const tracker = {getPeers}
export default tracker 