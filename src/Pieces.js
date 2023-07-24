import tp from './torrent-parser.js'


export default class Pieces {
  constructor(torrent) {
    function buildPiecesArray() {
      const nPieces = parseInt(torrent.info.pieces.length / 20)
      const arr = new Array(nPieces).fill(null);
      return arr.map((_, i) => new Array(tp.blocksPerPiece(torrent, i)).fill(false));
    }
    this.requested = buildPiecesArray()
    this.received = buildPiecesArray()
  }

  addRequested(pieceBlock) {
    const blockIndex = pieceBlock.begin / tp.BLOCK_LEN;
    this.requested[pieceBlock.index][blockIndex] = true;
  }

  addReceived(pieceBlock) {
    const blockIndex = pieceBlock.begin / tp.BLOCK_LEN;
    // console.log(pieceBlock)
    this.received[pieceBlock.index][blockIndex] = true;
  }

  needed(pieceBlock) {
    if (this.requested.every(blocks => blocks.every(i => i))) {
      this.requested = this.received.map(blocks => blocks.slice());
    }
    const blockIndex = pieceBlock.begin / tp.BLOCK_LEN;
    return !this.requested[pieceBlock.index][blockIndex];
  }
  
  isDone() {
    return this.received.every(blocks => blocks.every(i => i));
  }

  printPercentDone() {
    const downloaded = this.received.reduce((totalBlocks, blocks) => {
      return blocks.filter(i => i).length + totalBlocks;
    }, 0);

    const total = this.received.reduce((totalBlocks, blocks) => {
      return blocks.length + totalBlocks;
    }, 0);

    const percent = Math.floor(downloaded / total * 100);

    process.stdout.write('progress: ' + percent + '%\r');
  }
}