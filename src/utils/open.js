import fs from 'fs';
import bencode from 'bencode';

export const open = filePath => {
  return bencode.decode(fs.readFileSync(filePath));
};
