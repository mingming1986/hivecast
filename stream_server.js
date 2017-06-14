// Generated by CoffeeScript 1.12.6
(function() {
  var Bits, CustomReceiver, DEBUG_INCOMING_PACKET_DATA, DEBUG_INCOMING_PACKET_HASH, DEFAULT_SERVER_NAME, Sequent, StreamServer, aac, avstreams, config, crypto, fs, h264, http, logger, mp4, net, packageJson, ref, rtmp, rtsp, serverName;

  var uuid = require('node-uuid');

  net = require('net');

  fs = require('fs');

  crypto = require('crypto');

  config = require('./config');

  rtmp = require('./rtmp');

  http = require('./http');

  rtsp = require('./rtsp');

  h264 = require('./h264');

  aac = require('./aac');

  mp4 = require('./mp4');

  Bits = require('./bits');

  avstreams = require('./avstreams');

  CustomReceiver = require('./custom_receiver');

  logger = require('./logger');

  packageJson = require('./package.json');

  Sequent = require('sequent');

  // var datastore = require('@google-cloud/datastore')({
  //   projectId: 'hivecast-syndicate',
  //   keyFilename: './hivecast-syndicate.json'
  // });

  DEBUG_INCOMING_PACKET_DATA = false;

  DEBUG_INCOMING_PACKET_HASH = false;

  DEFAULT_SERVER_NAME = "node-rtsp-rtmp-server/" + packageJson.version;

  serverName = (ref = config.serverName) != null ? ref : DEFAULT_SERVER_NAME;

  StreamServer = (function() {
    function StreamServer(opts) {
      var httpHandler, ref1, rtmptCallback;
      this.serverName = (ref1 = opts != null ? opts.serverName : void 0) != null ? ref1 : serverName;
      if (config.enableRTMP || config.enableRTMPT) {
        this.rtmpServer = new rtmp.RTMPServer;
        this.rtmpServer.on('video_start', (function(_this) {
          return function(streamId) {
            var stream;
            stream = avstreams.getOrCreate(streamId);
            _this.dumpToFile(streamId);
            return _this.onReceiveVideoControlBuffer(stream);
          };
        })(this));
        this.rtmpServer.on('video_data', (function(_this) {
          return function(streamId, pts, dts, nalUnits) {
            var stream;
            stream = avstreams.get(streamId);
            if (stream != null) {
              return _this.onReceiveVideoPacket(stream, nalUnits, pts, dts);
            } else {
              return logger.warn("warn: Received invalid streamId from rtmp: " + streamId);
            }
          };
        })(this));
        this.rtmpServer.on('audio_start', (function(_this) {
          return function(streamId) {
            var stream;
            stream = avstreams.getOrCreate(streamId);
            return _this.onReceiveAudioControlBuffer(stream);
          };
        })(this));
        this.rtmpServer.on('audio_data', (function(_this) {
          return function(streamId, pts, dts, adtsFrame) {
            var stream;
            stream = avstreams.get(streamId);
            if (stream != null) {
              return _this.onReceiveAudioPacket(stream, adtsFrame, pts, dts);
            } else {
              return logger.warn("warn: Received invalid streamId from rtmp: " + streamId);
            }
          };
        })(this));
      }
      if (config.enableCustomReceiver) {
        this.customReceiver = new CustomReceiver(config.receiverType, {
          videoControl: (function(_this) {
            return function() {
              return _this.onReceiveVideoControlBuffer.apply(_this, arguments);
            };
          })(this),
          audioControl: (function(_this) {
            return function() {
              return _this.onReceiveAudioControlBuffer.apply(_this, arguments);
            };
          })(this),
          videoData: (function(_this) {
            return function() {
              return _this.onReceiveVideoDataBuffer.apply(_this, arguments);
            };
          })(this),
          audioData: (function(_this) {
            return function() {
              return _this.onReceiveAudioDataBuffer.apply(_this, arguments);
            };
          })(this)
        });
        this.customReceiver.deleteReceiverSocketsSync();
      }
      if (config.enableHTTP) {
        this.httpHandler = new http.HTTPHandler({
          serverName: this.serverName,
          documentRoot: opts != null ? opts.documentRoot : void 0
        });
      }
      if (config.enableRTSP || config.enableHTTP || config.enableRTMPT) {
        if (config.enableRTMPT) {
          rtmptCallback = (function(_this) {
            return function() {
              var ref2;
              return (ref2 = _this.rtmpServer).handleRTMPTRequest.apply(ref2, arguments);
            };
          })(this);
        } else {
          rtmptCallback = null;
        }
        if (config.enableHTTP) {
          httpHandler = this.httpHandler;
        } else {
          httpHandler = null;
        }
        this.rtspServer = new rtsp.RTSPServer({
          serverName: this.serverName,
          httpHandler: httpHandler,
          rtmptCallback: rtmptCallback
        });
        this.rtspServer.on('video_start', (function(_this) {
          return function(stream) {
            return _this.onReceiveVideoControlBuffer(stream);
          };
        })(this));
        this.rtspServer.on('audio_start', (function(_this) {
          return function(stream) {
            return _this.onReceiveAudioControlBuffer(stream);
          };
        })(this));
        this.rtspServer.on('video', (function(_this) {
          return function(stream, nalUnits, pts, dts) {
            return _this.onReceiveVideoNALUnits(stream, nalUnits, pts, dts);
          };
        })(this));
        this.rtspServer.on('audio', (function(_this) {
          return function(stream, accessUnits, pts, dts) {
            return _this.onReceiveAudioAccessUnits(stream, accessUnits, pts, dts);
          };
        })(this));
      }
      avstreams.on('new', function(stream) {
        if (DEBUG_INCOMING_PACKET_HASH) {
          return stream.lastSentVideoTimestamp = 0;
        }
      });
      avstreams.on('reset', function(stream) {
        if (DEBUG_INCOMING_PACKET_HASH) {
          return stream.lastSentVideoTimestamp = 0;
        }
      });
      avstreams.on('end', (function(_this) {
        return function(stream) {
          if (config.enableRTSP) {
            _this.rtspServer.sendEOS(stream);
          }
          if (config.enableRTMP || config.enableRTMPT) {
            return _this.rtmpServer.sendEOS(stream);
          }
        };
      })(this));
      avstreams.on('audio_data', (function(_this) {
        return function(stream, data, pts) {
          return _this.onReceiveAudioAccessUnits(stream, [data], pts, pts);
        };
      })(this));
      avstreams.on('video_data', (function(_this) {
        return function(stream, nalUnits, pts, dts) {
          if (dts == null) {
            dts = pts;
          }
          return _this.onReceiveVideoNALUnits(stream, nalUnits, pts, dts);
        };
      })(this));
      avstreams.on('audio_start', (function(_this) {
        return function(stream) {
          return _this.onReceiveAudioControlBuffer(stream);
        };
      })(this));
      avstreams.on('video_start', (function(_this) {
        return function(stream) {
          return _this.onReceiveVideoControlBuffer(stream);
        };
      })(this));
    }

    StreamServer.prototype.dumpToFile = function(streamId) {
      var serverAddr = config.serverAddress;
      var dumpId = (streamId.split('/'))[1];
      var spawn = require('child_process').spawn;

      var fileName = dumpId + '_' + uuid.v1() + '.flv';
      var dumpCmd = 'rtmpdump';
      //ffmpeg -re -i input.mp4 -c:v copy -c:a copy -f flv rtmp://localhost/live/STREAM_NAME
      //rtmpdump -v -r rtmp://localhost/live/STREAM_NAME -o dump.flv
      var dumpArgs = [
        '-v', 
        '-r', `rtmp://${serverAddr}/` + streamId,
        '-o', `public/file/${fileName}`
      ];
      var dumpProc = spawn(dumpCmd, dumpArgs);

      //var ds_key = datastore.key(['Stream', ])

      dumpProc.stdout.on('data', function(data) {
      });
      dumpProc.stderr.on('data', function(data) {
      });
      dumpProc.on('close', function() {
        console.log(`Stream dump is finished. File could be found at file/${fileName}`);

        /*setTimeout(function() {
          var streamCmd = 'ffmpeg';
          var streamArgs = [
            '-re',
            '-i', 'file/' + dumpId + '.flv',
            '-c', 'copy',
            '-f', 'flv',
            `rtmp://${serverAddr}/live/cloned_` + dumpId
          ];
          var streamProc = spawn(streamCmd, streamArgs);
          streamProc.on('close', function() {
            console.log(`FLV: file/${dumpId}.flv is streamed successfully.`);
          });
        }, 3000);*/
      });
    };

    StreamServer.prototype.attachRecordedDir = function(dir) {
      if (config.recordedApplicationName != null) {
        logger.info("attachRecordedDir: dir=" + dir + " app=" + config.recordedApplicationName);
        return avstreams.attachRecordedDirToApp(dir, config.recordedApplicationName);
      }
    };

    StreamServer.prototype.attachMP4 = function(filename, streamName) {
      var context, generator;
      logger.info("attachMP4: file=" + filename + " stream=" + streamName);
      context = this;
      generator = new avstreams.AVStreamGenerator({
        generate: function() {
          var ascBuf, ascInfo, audioSpecificConfig, bits, err, mp4File, mp4Stream, streamId;
          try {
            mp4File = new mp4.MP4File(filename);
          } catch (error) {
            err = error;
            logger.error("error opening MP4 file " + filename + ": " + err);
            return null;
          }
          streamId = avstreams.createNewStreamId();
          mp4Stream = new avstreams.MP4Stream(streamId);
          logger.info("created stream " + streamId + " from " + filename);
          avstreams.emit('new', mp4Stream);
          avstreams.add(mp4Stream);
          mp4Stream.type = avstreams.STREAM_TYPE_RECORDED;
          audioSpecificConfig = null;
          mp4File.on('audio_data', function(data, pts) {
            return context.onReceiveAudioAccessUnits(mp4Stream, [data], pts, pts);
          });
          mp4File.on('video_data', function(nalUnits, pts, dts) {
            if (dts == null) {
              dts = pts;
            }
            return context.onReceiveVideoNALUnits(mp4Stream, nalUnits, pts, dts);
          });
          mp4File.on('eof', (function(_this) {
            return function() {
              return mp4Stream.emit('end');
            };
          })(this));
          mp4File.parse();
          mp4Stream.updateSPS(mp4File.getSPS());
          mp4Stream.updatePPS(mp4File.getPPS());
          ascBuf = mp4File.getAudioSpecificConfig();
          bits = new Bits(ascBuf);
          ascInfo = aac.readAudioSpecificConfig(bits);
          mp4Stream.updateConfig({
            audioSpecificConfig: ascBuf,
            audioASCInfo: ascInfo,
            audioSampleRate: ascInfo.samplingFrequency,
            audioClockRate: 90000,
            audioChannels: ascInfo.channelConfiguration,
            audioObjectType: ascInfo.audioObjectType
          });
          mp4Stream.durationSeconds = mp4File.getDurationSeconds();
          mp4Stream.lastTagTimestamp = mp4File.getLastTimestamp();
          mp4Stream.mp4File = mp4File;
          mp4File.fillBuffer(function() {
            context.onReceiveAudioControlBuffer(mp4Stream);
            return context.onReceiveVideoControlBuffer(mp4Stream);
          });
          return mp4Stream;
        },
        play: function() {
          return this.mp4File.play();
        },
        pause: function() {
          return this.mp4File.pause();
        },
        resume: function() {
          return this.mp4File.resume();
        },
        seek: function(seekSeconds, callback) {
          var actualStartTime;
          actualStartTime = this.mp4File.seek(seekSeconds);
          return callback(null, actualStartTime);
        },
        sendVideoPacketsSinceLastKeyFrame: function(endSeconds, callback) {
          return this.mp4File.sendVideoPacketsSinceLastKeyFrame(endSeconds, callback);
        },
        teardown: function() {
          this.mp4File.close();
          return this.destroy();
        },
        getCurrentPlayTime: function() {
          return this.mp4File.currentPlayTime;
        },
        isPaused: function() {
          return this.mp4File.isPaused();
        }
      });
      return avstreams.addGenerator(streamName, generator);
    };

    StreamServer.prototype.stop = function(callback) {
      if (config.enableCustomReceiver) {
        this.customReceiver.deleteReceiverSocketsSync();
      }
      return typeof callback === "function" ? callback() : void 0;
    };

    StreamServer.prototype.start = function(callback) {
      var seq, waitCount;
      seq = new Sequent;
      waitCount = 0;
      if (config.enableRTMP) {
        waitCount++;
        this.rtmpServer.start({
          port: config.rtmpServerPort
        }, function() {
          return seq.done();
        });
      }
      if (config.enableCustomReceiver) {
        this.customReceiver.start();
      }
      if (config.enableRTSP || config.enableHTTP || config.enableRTMPT) {
        waitCount++;
        this.rtspServer.start({
          port: config.serverPort
        }, function() {
          return seq.done();
        });
      }
      return seq.wait(waitCount, function() {
        return typeof callback === "function" ? callback() : void 0;
      });
    };

    StreamServer.prototype.setLivePathConsumer = function(func) {
      if (config.enableRTSP) {
        return this.rtspServer.setLivePathConsumer(func);
      }
    };

    StreamServer.prototype.setAuthenticator = function(func) {
      if (config.enableRTSP) {
        return this.rtspServer.setAuthenticator(func);
      }
    };

    StreamServer.prototype.onReceiveVideoControlBuffer = function(stream, buf) {
      stream.resetFrameRate(stream);
      stream.isVideoStarted = true;
      stream.timeAtVideoStart = Date.now();
      return stream.timeAtAudioStart = stream.timeAtVideoStart;
    };

    StreamServer.prototype.onReceiveAudioControlBuffer = function(stream, buf) {
      stream.isAudioStarted = true;
      stream.timeAtAudioStart = Date.now();
      return stream.timeAtVideoStart = stream.timeAtAudioStart;
    };

    StreamServer.prototype.onReceiveVideoDataBuffer = function(stream, buf) {
      var dts, nalUnit, pts;
      pts = buf[1] * 0x010000000000 + buf[2] * 0x0100000000 + buf[3] * 0x01000000 + buf[4] * 0x010000 + buf[5] * 0x0100 + buf[6];
      dts = pts;
      nalUnit = buf.slice(7);
      return this.onReceiveVideoPacket(stream, nalUnit, pts, dts);
    };

    StreamServer.prototype.onReceiveAudioDataBuffer = function(stream, buf) {
      var adtsFrame, dts, pts;
      pts = buf[1] * 0x010000000000 + buf[2] * 0x0100000000 + buf[3] * 0x01000000 + buf[4] * 0x010000 + buf[5] * 0x0100 + buf[6];
      dts = pts;
      adtsFrame = buf.slice(7);
      return this.onReceiveAudioPacket(stream, adtsFrame, pts, dts);
    };

    StreamServer.prototype.onReceiveVideoNALUnits = function(stream, nalUnits, pts, dts) {
      var hasVideoFrame, j, len, md5, nalUnit, nalUnitType, tsDiff;
      if (DEBUG_INCOMING_PACKET_DATA) {
        logger.info("receive video: num_nal_units=" + nalUnits.length + " pts=" + pts);
      }
      if (config.enableRTSP) {
        this.rtspServer.sendVideoData(stream, nalUnits, pts, dts);
      }
      if (config.enableRTMP || config.enableRTMPT) {
        this.rtmpServer.sendVideoPacket(stream, nalUnits, pts, dts);
      }
      hasVideoFrame = false;
      for (j = 0, len = nalUnits.length; j < len; j++) {
        nalUnit = nalUnits[j];
        nalUnitType = h264.getNALUnitType(nalUnit);
        if (nalUnitType === h264.NAL_UNIT_TYPE_SPS) {
          stream.updateSPS(nalUnit);
        } else if (nalUnitType === h264.NAL_UNIT_TYPE_PPS) {
          stream.updatePPS(nalUnit);
        } else if ((nalUnitType === h264.NAL_UNIT_TYPE_IDR_PICTURE) || (nalUnitType === h264.NAL_UNIT_TYPE_NON_IDR_PICTURE)) {
          hasVideoFrame = true;
        }
        if (DEBUG_INCOMING_PACKET_HASH) {
          md5 = crypto.createHash('md5');
          md5.update(nalUnit);
          tsDiff = pts - stream.lastSentVideoTimestamp;
          logger.info("video: pts=" + pts + " pts_diff=" + tsDiff + " md5=" + (md5.digest('hex').slice(0, 7)) + " nal_unit_type=" + nalUnitType + " bytes=" + nalUnit.length);
          stream.lastSentVideoTimestamp = pts;
        }
      }
      if (hasVideoFrame) {
        stream.calcFrameRate(pts);
      }
    };

    StreamServer.prototype.onReceiveVideoPacket = function(stream, nalUnitGlob, pts, dts) {
      var nalUnits;
      nalUnits = h264.splitIntoNALUnits(nalUnitGlob);
      if (nalUnits.length === 0) {
        return;
      }
      this.onReceiveVideoNALUnits(stream, nalUnits, pts, dts);
    };

    StreamServer.prototype.onReceiveAudioAccessUnits = function(stream, accessUnits, pts, dts) {
      var accessUnit, i, j, len, md5, ptsPerFrame;
      if (config.enableRTSP) {
        this.rtspServer.sendAudioData(stream, accessUnits, pts, dts);
      }
      if (DEBUG_INCOMING_PACKET_DATA) {
        logger.info("receive audio: num_access_units=" + accessUnits.length + " pts=" + pts);
      }
      ptsPerFrame = 90000 / (stream.audioSampleRate / 1024);
      for (i = j = 0, len = accessUnits.length; j < len; i = ++j) {
        accessUnit = accessUnits[i];
        if (DEBUG_INCOMING_PACKET_HASH) {
          md5 = crypto.createHash('md5');
          md5.update(accessUnit);
          logger.info("audio: pts=" + pts + " md5=" + (md5.digest('hex').slice(0, 7)) + " bytes=" + accessUnit.length);
        }
        if (config.enableRTMP || config.enableRTMPT) {
          this.rtmpServer.sendAudioPacket(stream, accessUnit, Math.round(pts + ptsPerFrame * i), Math.round(dts + ptsPerFrame * i));
        }
      }
    };

    StreamServer.prototype.onReceiveAudioPacket = function(stream, adtsFrameGlob, pts, dts) {
      var adtsFrame, adtsFrames, adtsInfo, i, isConfigUpdated, j, len, rawDataBlock, rawDataBlocks, rtpTimePerFrame;
      adtsFrames = aac.splitIntoADTSFrames(adtsFrameGlob);
      if (adtsFrames.length === 0) {
        return;
      }
      adtsInfo = aac.parseADTSFrame(adtsFrames[0]);
      isConfigUpdated = false;
      stream.updateConfig({
        audioSampleRate: adtsInfo.sampleRate,
        audioClockRate: adtsInfo.sampleRate,
        audioChannels: adtsInfo.channels,
        audioObjectType: adtsInfo.audioObjectType
      });
      rtpTimePerFrame = 1024;
      rawDataBlocks = [];
      for (i = j = 0, len = adtsFrames.length; j < len; i = ++j) {
        adtsFrame = adtsFrames[i];
        rawDataBlock = adtsFrame.slice(7);
        rawDataBlocks.push(rawDataBlock);
      }
      return this.onReceiveAudioAccessUnits(stream, rawDataBlocks, pts, dts);
    };

    return StreamServer;

  })();

  module.exports = StreamServer;

}).call(this);
