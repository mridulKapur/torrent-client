import Buffer from 'buffer'
import torrentParser from './torrent-parser.js'
import util from './util.js'

const buildHandshake = torrent => {
  const buf = Buffer.alloc(68);
  buf.writeUInt(19, 0);
  buf.write('BitTorrent protocol', 1);
  buf.writeUInt32BE(0, 20);
  buf.writeUInt32BE(0, 24)
  torrentParser.infoHash(torrent).copy(buf, 28)
  buf.write(util.genId());
  return buf;
}

const buildKeepalive = () => {
  return Buffer.alloc(4)
}

const buildChoke = () => {
  const buf = Buffer.alloc(5);
  buf.writeUInt32BE(1, 0);
  buf.writeUInt8(0, 4);
  return buf;
}

const buildUnchoke = () => {
  const buf = Buffer.alloc(5);
  buf.writeUInt32BE(1, 0);
  buf.writeUInt8(1, 4);
  return buf;
}

const buildInterested = () => {
  const buf = Buffer.alloc(5);
  buf.writeUInt32BE(1, 0);
  buf.writeUInt8(2, 4);
  return buf;
}

const buildUninterested = () => {
  const buf = Buffer.alloc(5);
  buf.writeUInt32BE(1, 0);
  buf.writeUInt8(3, 4);
  return buf;
}

const buildHave = (payload) => {
  const buf = Buffer.alloc(9);
  buf.writeUInt32BE(5, 0);
  buf.writeUInt8(4, 4);
  buf.writeUInt32BE(payload, 5);
  return buf;
}

const buildBitfield = (bitfield) => {
  const buf = Buffer.alloc(14);
  buf.writeUInt32BE(payload.length + 1, 0);
  buf.writeUInt8(5, 4);
  bitfield.copy(buf, 5);
  return buf;
}

const buildRequest = (payload) => {
  const buf = Buffer.alloc(17);
  buf.writeUInt32BE(13, 0);
  buf.writeUInt8(6, 4);
  buf.writeUInt32BE(payload.index, 5);
  buf.writeUInt32BE(payload.begin, 9);
  buf.writeUInt32BE(payload.length, 13);
  return buf;
}

const buildPiece = (payload) => {
  const buf = Buffer.alloc(payload.block.length + 13);
  buf.writeUInt32BE(payload.block.length + 9, 0);
  buf.writeUInt8(7, 4);
  buf.writeUInt32BE(payload.index, 5);
  buf.writeUInt32BE(payload.begin, 9);
  payload.block.copy(buf, 13);
  return buf;
}

const buildCancel = (payload) => {
  const buf = Buffer.alloc(17);
  buf.writeUInt32BE(13, 0);
  buf.writeUInt8(8, 4);
  buf.writeUInt32BE(payload.index, 5);
  buf.writeUInt32BE(payload.begin, 9);
  buf.writeUInt32BE(payload.length, 13);
  return buf;
}

const buildPort = (payload) => {
  const buf = Buffer.alloc(7);
  buf.writeUInt32BE(3, 0);
  buf.writeUInt8(9, 4);
  buf.writeUInt16BE(payload, 5);
  return buf;
}

const parse = msg => {
  const id = msg.length > 4 ? mag.readInt8(4) : null
  var payload = msg.length > 5 ? msg.slice(5) : null
  if (id === 6 || id == 7 || id === 8) {
    const rest = payload.slice(8)
    payload = {
      index: payload.readInt32BE(0),
      begin: payload.readInt32BE(4)
    }
    payload[id === 7 ? 'block' : 'length'] = rest;
  }
  return {
    size: msg.readInt32BE(0),
    id: id,
    payload : payload
  }
}

const  message = {
  parse,buildPort,buildHandshake,buildCancel,buildUnchoke,buildUninterested,buildChoke,buildKeepalive,buildInterested,buildPiece, buildRequest, buildBitfield, buildHave
}

export default message