// Generated by CoffeeScript 1.12.6
(function() {
  var DHKeyGenerate, GenuineFMSConst, GenuineFMSConstCrud, GenuineFPConst, GenuineFPConstCrud, GetClientDHOffset, GetClientGenuineConstDigestOffset, GetServerDHOffset, GetServerGenuineConstDigestOffset, KEY_LENGTH, MESSAGE_FORMAT_1, MESSAGE_FORMAT_2, MESSAGE_FORMAT_UNKNOWN, RTMP_SIG_SIZE, RandomCrud, SHA256DL, codec_utils, crypto, detectClientMessageFormat, generateS0S1S2, generateS1, generateS2, hasSameBytes, logger;

  crypto = require('crypto');

  codec_utils = require('./codec_utils');

  logger = require('./logger');

  MESSAGE_FORMAT_1 = 1;

  MESSAGE_FORMAT_2 = 2;

  MESSAGE_FORMAT_UNKNOWN = -1;

  RTMP_SIG_SIZE = 1536;

  SHA256DL = 32;

  KEY_LENGTH = 128;

  RandomCrud = new Buffer([0xf0, 0xee, 0xc2, 0x4a, 0x80, 0x68, 0xbe, 0xe8, 0x2e, 0x00, 0xd0, 0xd1, 0x02, 0x9e, 0x7e, 0x57, 0x6e, 0xec, 0x5d, 0x2d, 0x29, 0x80, 0x6f, 0xab, 0x93, 0xb8, 0xe6, 0x36, 0xcf, 0xeb, 0x31, 0xae]);

  GenuineFMSConst = "Genuine Adobe Flash Media Server 001";

  GenuineFMSConstCrud = Buffer.concat([new Buffer(GenuineFMSConst, "utf8"), RandomCrud]);

  GenuineFPConst = "Genuine Adobe Flash Player 001";

  GenuineFPConstCrud = Buffer.concat([new Buffer(GenuineFPConst, "utf8"), RandomCrud]);

  GetClientGenuineConstDigestOffset = function(buf) {
    var offset;
    offset = buf[0] + buf[1] + buf[2] + buf[3];
    offset = (offset % 728) + 12;
    return offset;
  };

  GetServerGenuineConstDigestOffset = function(buf) {
    var offset;
    offset = buf[0] + buf[1] + buf[2] + buf[3];
    offset = (offset % 728) + 776;
    return offset;
  };

  GetClientDHOffset = function(buf) {
    var offset;
    offset = buf[0] + buf[1] + buf[2] + buf[3];
    offset = (offset % 632) + 772;
    return offset;
  };

  GetServerDHOffset = function(buf) {
    var offset;
    offset = buf[0] + buf[1] + buf[2] + buf[3];
    offset = (offset % 632) + 8;
    return offset;
  };

  hasSameBytes = function(buf1, buf2) {
    var i, j, ref;
    for (i = j = 0, ref = buf1.length; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
      if (buf1[i] !== buf2[i]) {
        return false;
      }
    }
    return true;
  };

  detectClientMessageFormat = function(clientsig) {
    var computedSignature, msg, providedSignature, sdl;
    sdl = GetServerGenuineConstDigestOffset(clientsig.slice(772, 776));
    msg = Buffer.concat([clientsig.slice(0, sdl), clientsig.slice(sdl + SHA256DL)], 1504);
    computedSignature = codec_utils.calcHmac(msg, GenuineFPConst);
    providedSignature = clientsig.slice(sdl, sdl + SHA256DL);
    if (hasSameBytes(computedSignature, providedSignature)) {
      return MESSAGE_FORMAT_2;
    }
    sdl = GetClientGenuineConstDigestOffset(clientsig.slice(8, 12));
    msg = Buffer.concat([clientsig.slice(0, sdl), clientsig.slice(sdl + SHA256DL)], 1504);
    computedSignature = codec_utils.calcHmac(msg, GenuineFPConst);
    providedSignature = clientsig.slice(sdl, sdl + SHA256DL);
    if (hasSameBytes(computedSignature, providedSignature)) {
      return MESSAGE_FORMAT_1;
    }
    return MESSAGE_FORMAT_UNKNOWN;
  };

  DHKeyGenerate = function(bits) {
    var dh;
    dh = crypto.getDiffieHellman('modp2');
    dh.generateKeys();
    return dh;
  };

  generateS1 = function(messageFormat, dh, callback) {
    return crypto.pseudoRandomBytes(RTMP_SIG_SIZE - 8, function(err, randomBytes) {
      var handshakeBytes, hash, msg, publicKey, serverDHOffset, serverDigestOffset;
      handshakeBytes = Buffer.concat([new Buffer([0, 0, 0, 0, 1, 2, 3, 4]), randomBytes], RTMP_SIG_SIZE);
      if (messageFormat === 1) {
        serverDHOffset = GetClientDHOffset(handshakeBytes.slice(1532, 1536));
      } else {
        serverDHOffset = GetServerDHOffset(handshakeBytes.slice(768, 772));
      }
      publicKey = dh.getPublicKey();
      publicKey.copy(handshakeBytes, serverDHOffset, 0, publicKey.length);
      if (messageFormat === 1) {
        serverDigestOffset = GetClientGenuineConstDigestOffset(handshakeBytes.slice(8, 12));
      } else {
        serverDigestOffset = GetServerGenuineConstDigestOffset(handshakeBytes.slice(772, 776));
      }
      msg = Buffer.concat([handshakeBytes.slice(0, serverDigestOffset), handshakeBytes.slice(serverDigestOffset + SHA256DL)], RTMP_SIG_SIZE - SHA256DL);
      hash = codec_utils.calcHmac(msg, GenuineFMSConst);
      hash.copy(handshakeBytes, serverDigestOffset, 0, 32);
      return callback(null, handshakeBytes);
    });
  };

  generateS2 = function(messageFormat, clientsig, callback) {
    var challengeKey, challengeKeyOffset, hash, key, keyOffset;
    if (messageFormat === 1) {
      challengeKeyOffset = GetClientGenuineConstDigestOffset(clientsig.slice(8, 12));
    } else {
      challengeKeyOffset = GetServerGenuineConstDigestOffset(clientsig.slice(772, 776));
    }
    challengeKey = clientsig.slice(challengeKeyOffset, +(challengeKeyOffset + 31) + 1 || 9e9);
    if (messageFormat === 1) {
      keyOffset = GetClientDHOffset(clientsig.slice(1532, 1536));
    } else {
      keyOffset = GetServerDHOffset(clientsig.slice(768, 772));
    }
    key = clientsig.slice(keyOffset, keyOffset + KEY_LENGTH);
    hash = codec_utils.calcHmac(challengeKey, GenuineFMSConstCrud);
    return crypto.pseudoRandomBytes(RTMP_SIG_SIZE - 32, function(err, randomBytes) {
      var s2Bytes, signature;
      signature = codec_utils.calcHmac(randomBytes, hash);
      s2Bytes = Buffer.concat([randomBytes, signature], RTMP_SIG_SIZE);
      return callback(null, s2Bytes, {
        clientPublicKey: key
      });
    });
  };

  generateS0S1S2 = function(clientsig, callback) {
    var clientType, dh, messageFormat;
    clientType = clientsig[0];
    clientsig = clientsig.slice(1);
    dh = DHKeyGenerate(KEY_LENGTH * 8);
    messageFormat = detectClientMessageFormat(clientsig);
    if (messageFormat === MESSAGE_FORMAT_UNKNOWN) {
      logger.warn("[rtmp:handshake] warning: unknown message format, assuming format 1");
      messageFormat = 1;
    }
    return generateS1(messageFormat, dh, function(err, s1Bytes) {
      return generateS2(messageFormat, clientsig, function(err, s2Bytes, keys) {
        var allBytes;
        allBytes = Buffer.concat([new Buffer([clientType]), s1Bytes, s2Bytes], 3073);
        keys.dh = dh;
        return callback(null, allBytes, keys);
      });
    });
  };

  module.exports = {
    generateS0S1S2: generateS0S1S2
  };

}).call(this);
