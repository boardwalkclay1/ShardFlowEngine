// shardflow.core.js
const ShardFlowCore = (() => {
  const state = {
    appId: ShardFlowConfig.appId,
    appName: ShardFlowConfig.appName,
    namespace: ShardFlowConfig.namespace,

    // hub / shard info
    isHub: false,
    hubId: ShardFlowConfig.defaultHubId,
    shardId: null,

    // peers keyed by peerId
    peers: {},

    // event handlers
    handlers: {
      message: [],
      peerConnected: [],
      peerDisconnected: [],
      error: [],
      log: []
    },

    // self identity
    selfId: `sf-${Math.random().toString(36).slice(2, 10)}`,
    role: "client", // "client" | "hub" | "shard-hub"
  };

  function log(...args) {
    console.log("[ShardFlow]", ...args);
    fire("log", args);
  }

  function fire(event, payload) {
    (state.handlers[event] || []).forEach(fn => {
      try { fn(payload); } catch (e) { console.error(e); }
    });
  }

  function on(event, fn) {
    if (!state.handlers[event]) state.handlers[event] = [];
    state.handlers[event].push(fn);
  }

  function registerPeer(peerId, conn) {
    state.peers[peerId] = conn;
    fire("peerConnected", { peerId });
    log("Peer connected:", peerId);
  }

  function unregisterPeer(peerId) {
    if (state.peers[peerId]) {
      try { state.peers[peerId].close && state.peers[peerId].close(); } catch {}
      delete state.peers[peerId];
      fire("peerDisconnected", { peerId });
      log("Peer disconnected:", peerId);
    }
  }

  function broadcast(payload) {
    const msg = {
      ns: state.namespace,
      appId: state.appId,
      from: state.selfId,
      ts: Date.now(),
      payload
    };
    const data = JSON.stringify(msg);
    Object.values(state.peers).forEach(peer => {
      const dc = peer.dataChannel;
      if (dc && dc.readyState === "open") {
        dc.send(data);
      }
    });
  }

  function handleIncomingMessage(msg) {
    if (!msg || msg.ns !== state.namespace) return;
    fire("message", msg);
  }

  return {
    state,
    on,
    log,
    fire,
    registerPeer,
    unregisterPeer,
    broadcast,
    handleIncomingMessage
  };
})();
