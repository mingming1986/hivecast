// Generated by CoffeeScript 1.12.6
(function() {
  var os;

  os = require('os');

  module.exports = {

    /* Basic configurations */
    serverPort: 80,
    rtmpServerPort: 1935,
    serverName: 'hiveCast',
    serverAddress: '35.190.180.46',
    videoFrameRate: 30,
    videoBitrateKbps: 2000,
    audioBitrateKbps: 40,

    /* Enable/disable each functions */
    enableRTSP: false,
    enableRTMP: true,
    enableRTMPT: false,
    enableHTTP: true,
    enableCustomReceiver: false,

    /* Custom protocol receiver configurations */
    receiverType: os.platform() === 'win32' ? 'tcp' : 'unix',
    videoControlReceiverPath: '/tmp/node_rtsp_rtmp_videoControl',
    audioControlReceiverPath: '/tmp/node_rtsp_rtmp_audioControl',
    videoDataReceiverPath: '/tmp/node_rtsp_rtmp_videoData',
    audioDataReceiverPath: '/tmp/node_rtsp_rtmp_audioData',
    receiverListenHost: '0.0.0.0',
    videoControlReceiverPort: 1111,
    audioControlReceiverPort: 1112,
    videoDataReceiverPort: 1113,
    audioDataReceiverPort: 1114,
    receiverTCPBacklog: 511,

    /* RTSP configurations */
    audioRTPServerPort: 7042,
    audioRTCPServerPort: 7043,
    videoRTPServerPort: 7044,
    videoRTCPServerPort: 7045,

    /* RTSP/RTMP configurations */
    liveApplicationName: 'live',
    recordedApplicationName: 'file',
    recordedDir: 'file',

    /* RTMP configurations */
    rtmpWaitForKeyFrame: false,
    flv: {
      hasVideo: true,
      videocodecid: 7,
      audiocodecid: 10
    },

    /* Advanced configurations */
    audioPeriodSize: 1024,
    keepaliveTimeoutMs: 30000,
    rtcpSenderReportIntervalMs: 5000,
    rtmpPingTimeoutMs: 5000,
    rtmpSessionTimeoutMs: 600000,
    rtmptSessionTimeoutMs: 600000,
    rtmpPlayChunkSize: 4096,
    rtmpMessageQueueSize: 5,
    rtspDisableHierarchicalSBR: true,
    rtmpDisableHierarchicalSBR: true,
    dropH264AccessUnitDelimiter: true,
    debug: {
      dropAllData: false
    },
    rtspVideoDataUDPListenPort: 5004,
    rtspVideoControlUDPListenPort: 5005,
    rtspAudioDataUDPListenPort: 5006,
    rtspAudioControlUDPListenPort: 5007
  };

}).call(this);
