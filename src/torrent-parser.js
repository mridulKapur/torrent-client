import fs from 'fs';
import bencode from 'bencode'
import crypto from 'crypto'
import {Buffer} from 'buffer'

const openTorrent = (path) => {
  const data = fs.readFileSync(path);
  // console.log(bencode.decode(data))
  return bencode.decode(fs.readFileSync(path));
}

const sizeLeft = torrent => {
  // console.log("13" , torrent["info"])
  const sizeL = torrent.info.files ? torrent.info.files.map(file => file.length).reduce((a, b) => a + b) : torrent.info.length;
  var str = sizeL.toString('2');
  while (str.length < 64) {
    str = '0' + str;
  }
  const buf = Buffer.from(str,'binary');
  return buf
}

const infoHash = torrent => {
  const info = bencode.encode(torrent.info)
  return crypto.createHash('sha1').update(info).digest();
};

const pieceLen = (torrent, pieceIndex) => {
  const totalLength = Number(sizeLeft(torrent).readBigInt64BE());
  const pieceLength = torrent.info['piece length']
  
  const lastPieceLength = totalLength % pieceLength;
  const lastPieceIndex = Math.floor(totalLength / pieceLength)
  
  return lastPieceIndex === pieceIndex ? lastPieceLength :pieceLength
}

const blocksPerPiece = (torrent, pieceIndex) => {
  const pieceLength = pieceLen(torrent, pieceIndex);
  return Math.ceil(pieceLength / BLOCK_LEN)
}

const blockLen = (torrent, pieceIndex, blockIndex) => {
  const pieceLength = pieceLen(torrent, pieceIndex);

  const lastPieceLength = pieceLength % BLOCK_LEN;
  const lastPieceIndex = Math.floor(pieceLength / BLOCK_LEN)

  return blockIndex === lastPieceIndex ? lastPieceLength : BLOCK_LEN
}

const BLOCK_LEN = Math.pow(2,14)

export default {openTorrent, sizeLeft, infoHash, pieceLen,blocksPerPiece,blockLen ,BLOCK_LEN}
