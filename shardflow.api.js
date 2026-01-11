// shardflow.api.js
const ShardFlow = (() => {
  let beaconPollTimer = null;

  function init(options = {}) {
    if (options.appId) ShardFlowCore.state.appId = options.appId;
    if (options.appName) ShardFlowCore.state.appName = options.appName;
    if (options.namespace) ShardFlowCore.state.namespace = options.namespace;
    if (options.hubId) ShardFlowCore.state.hubId = options.hubId;
    if (options.role) ShardFlowCore.state.role = options.role;
    if (options.beaconEndpoints) {
      Object.assign(ShardFlowConfig.beaconEndpoints, options.beaconEndpoints);
    }

    ShardFlowCore.log("ShardFlow initialized", {
      appId: ShardFlowCore.state.appId,
      appName: ShardFlowCore.state.appName,
      role: ShardFlowCore.state.role,
      hubId: ShardFlowCore.state.hubId
    });
  }

  // === Public event hooks ===
  function onMessage(fn) { ShardFlowCore.on("message", ({ payload, from }) => fn(payload, from)); }
  function onPeerConnected(fn) { ShardFlowCore.on("peerConnected", fn); }
  function onPeerDisconnected(fn) { ShardFlowCore.on("peerDisconnected", fn); }
  function onError(fn) { ShardFlowCore.on("error", fn); }

  // === Basic data API ===
  function broadcast(payload) {
    ShardFlowCore.broadcast(payload);
  }

  // === Hub mode (you act as a hub / super-peer) ===
  async function startHub() {
    ShardFlowCore.state.isHub = true;
    ShardFlowCore.state.role = "hub";

    ShardFlowCore.log("Starting hub mode");
    // Step 1: create a "public" offer that clients will use
    const hubPeerId = ShardFlowCore.state.hubId || "HUB_MAIN";
    const { offer } = await ShardFlowWebRTC.createOffer(hubPeerId);

    // Step 2: publish this offer via beacon
    await ShardFlowBeacon.postJson(ShardFlowConfig.beaconEndpoints.offerUrl, {
      type: "hub-offer",
      hubId: hubPeerId,
      appId: ShardFlowCore.state.appId,
      offer,
      timestamp: Date.now()
    });

    // Step 3: start polling for answers
    if (beaconPollTimer) clearInterval(beaconPollTimer);
    beaconPollTimer = setInterval(checkForAnswers, ShardFlowConfig.beaconPollInterval);
  }

  async function checkForAnswers() {
    try {
      const data = await ShardFlowBeacon.fetchJson(ShardFlowConfig.beaconEndpoints.answerUrl);
      if (!data || !Array.isArray(data.answers)) return;

      for (const ans of data.answers) {
        const peerId = ans.peerId;
        if (ShardFlowCore.state.peers[peerId]) {
          continue; // already connected or in progress
        }
        ShardFlowCore.log("Accepting answer from", peerId);
        await ShardFlowWebRTC.acceptAnswer(peerId, ans.answer);
      }
    } catch (e) {
      ShardFlowCore.fire("error", e);
      console.error("[ShardFlow] checkForAnswers error", e);
    }
  }

  // === Client mode (connect to a hub) ===
  async function connectToHub() {
    ShardFlowCore.state.isHub = false;
    ShardFlowCore.state.role = "client";

    const hubOfferUrl = ShardFlowConfig.beaconEndpoints.hubOfferUrl;
    const clientAnswerUrl = ShardFlowConfig.beaconEndpoints.clientAnswerUrl;

    const hubOfferData = await ShardFlowBeacon.fetchJson(hubOfferUrl);
    if (!hubOfferData || !hubOfferData.offer) {
      throw new Error("No hub offer available at " + hubOfferUrl);
    }

    const hubId = hubOfferData.hubId || "HUB_MAIN";
    const { answer } = await ShardFlowWebRTC.acceptOffer(hubId, hubOfferData.offer);

    // Now publish our answer so the hub can connect back
    await ShardFlowBeacon.postJson(clientAnswerUrl, {
      type: "client-answer",
      hubId,
      peerId: ShardFlowCore.state.selfId,
      answer,
      timestamp: Date.now()
    });

    ShardFlowCore.log("Client answer published for hub", hubId);
  }

  // === Shard logic (simple abstraction) ===
  function setShardId(id) {
    ShardFlowCore.state.shardId = id;
  }

  function getState() {
    return {
      selfId: ShardFlowCore.state.selfId,
      role: ShardFlowCore.state.role,
      hubId: ShardFlowCore.state.hubId,
      shardId: ShardFlowCore.state.shardId,
      peers: Object.keys(ShardFlowCore.state.peers)
    };
  }

  return {
    init,
    startHub,
    connectToHub,
    broadcast,
    onMessage,
    onPeerConnected,
    onPeerDisconnected,
    onError,
    setShardId,
    getState
  };
})();
