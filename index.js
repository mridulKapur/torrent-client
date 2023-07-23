import {download} from './src/download.js'
import torrentParser from './src/torrent-parser.js'
 
const torrent = torrentParser.openTorrent('./puppy.torrent');

console.log(torrent)

download(torrent,torrent.info.name)

