import { open } from './src/utils/open.js';
import { getPeers } from './src/tracker.js';

const torrent = open('HL2-FTP.torrent');

getPeers(torrent).then(peers => console.log(peers));
