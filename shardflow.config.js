// shardflow.config.js
const ShardFlowConfig = {
  appId: "UNSPECIFIED_APP",
  // Human-readable app name
  appName: "ShardFlow Enabled App",

  // Used to tag messages and separate traffic per app
  namespace: "SHARDFLOW",

  // How often to poll beacon endpoints (ms) when in auto-connect mode
  beaconPollInterval: 2000,

  // Default STUN servers (iceServers)
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:global.stun.twilio.com:3478?transport=udp" }
  ],

  // Optional: logical hub name for this instance
  defaultHubId: "HUB_MAIN",

  // Beacon endpoints are placeholders; you wire these to your site
  beaconEndpoints: {
    // Where this instance publishes its OFFER (when acting as hub)
    offerUrl: null,   // e.g. "https://your-site.com/boardwalk-offer.json"
    // Where this instance reads answers from (when acting as hub)
    answerUrl: null,  // e.g. "https://your-site.com/boardwalk-answer.json"
    // Where a joining client reads the hub’s offer from
    hubOfferUrl: null,
    // Where a joining client writes its answer to
    clientAnswerUrl: null
  }
};
