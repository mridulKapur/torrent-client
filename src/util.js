import crypto from 'crypto'

var id = null;

const genId = () => {
  if (!id) {
    id = crypto.randomBytes(20);
    Buffer.from('-MTC001-').copy(id, 0);
  }
  return id;
}

export default {genId}