import tp from "./torrent-parser.js"

export default class Queue {
  constructor(torrent) {
    this._torrent = torrent;
    this._queue = [];
    this.chocked = true;
  }

  queue(pieceIndex) {
    const nBlocks = tp.blocksPerPiece(this._torrent, pieceIndex);
    // console.log(this._torrent)
    for (var i = 0; i < nBlocks; i++){
      const pieceBlock = {
        index: pieceIndex,
        begin: i * tp.BLOCK_LEN,
        length: tp.blockLen(this._torrent, pieceIndex, i)
      }
      this._queue.push(pieceBlock)
    }
  }

  deque() { return this._queue.shift(); }
  peek() { return this._queue[0]; }
  length() { return this._queue.length; } 
}