const zmq = require('zeromq');

const CURRENT_REQUEST_VERSION = 1;

/**
 * Creates a connection to Citra
 * @param {string} [address=127.0.0.1] Citra's address
 * @param {number} [port=45987] Citra's port
 * @returns {Promise<Socket>} The connection to Citra as a promise
 */
const createConnection = (address = '127.0.0.1', port = 45987) => {
  const sock = zmq.socket('req');

  return new Promise(resolve => {
    sock.on('connect', () => {
      return resolve(sock);
    });
    sock.monitor(500, 0);
    sock.connect(`tcp://${address}:${port}`);
  });
};

/**
 * Reads from Citra's memory
 * @param {Promise<Socket>} citra The Citra connection
 * @param {number} memoryAddr The memory address to read from Citra
 * @param {number} dataLength The length of data to read from Citra's memory
 * @returns {number} The value from Citra's memory
 */
const readMemory = (citra, memoryAddr, dataLength) => {
  const READ = 1;
  const reqData = make32BitBuffer(memoryAddr, dataLength);
  const { header, reqId } = generateHeader(READ, reqData.length);
  const request = Buffer.concat([header, reqData]);
  return Promise.resolve(citra)
    .then(sock => sendRequest(sock, request, reqId, READ, dataLength))
    .then(response => readAndValidateHeader(response, reqId, READ, dataLength));
};

/**
 * Writes to Citra's memory
 * @param {Promise<Socket>} citra The Citra connection
 * @param {number} memoryAddr The memory address to write to Citra
 * @param {Buffer} buf The data to write to Citra
 * @returns {Buffer} The response from Citra
 */
const writeMemory = (citra, memoryAddr, buf) => {
  const WRITE = 2;
  const reqData = make32BitBuffer(memoryAddr, buf.length);
  const { header, reqId } = generateHeader(WRITE, reqData.length + buf.length);
  const request = Buffer.concat([header, reqData, buf]);
  return Promise.resolve(citra).then(sock =>
    sendRequest(sock, request, reqId, WRITE, 0),
  );
};

const make32BitBuffer = (...nums) => {
  return Buffer.from(new Uint32Array(nums).buffer);
};

const generateHeader = (reqType, dataLen) => {
  const reqId = Math.floor(Math.random() * 0xffffffff);
  return {
    reqId,
    header: make32BitBuffer(CURRENT_REQUEST_VERSION, reqId, reqType, dataLen),
  };
};

const sendRequest = (sock, request) => {
  return new Promise((resolve, reject) => {
    sock.once('message', response => {
      return resolve(response);
    });

    sock.once('error', error => {
      return reject(error);
    });

    sock.send(request);
  });
};

const readAndValidateHeader = (
  reply,
  expectedId,
  expectedType,
  expectedLength,
) => {
  const [replyVersion, replyId, replyType, replyLen, data] = parseReply(
    reply,
    expectedLength,
  );

  if (
    CURRENT_REQUEST_VERSION === replyVersion &&
    replyId === expectedId &&
    replyType === expectedType
  ) {
    return data;
  }

  return null;
};

const parseReply = (reply) => {
  return [
    reply.readUIntLE(0, 4),
    reply.readUIntLE(4, 4),
    reply.readUIntLE(8, 4),
    reply.readUIntLE(12, 4),
    reply.slice(16)
  ];
};

module.exports = {
  createConnection,
  readMemory,
  writeMemory,
};
