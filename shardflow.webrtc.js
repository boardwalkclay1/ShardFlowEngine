// shardflow.webrtc.js
const ShardFlowWebRTC = (() => {
  function createPeerConnection(peerId, isInitiator) {
    const pc = new RTCPeerConnection({ iceServers: ShardFlowConfig.iceServers });

    const conn = {
      peerId,
      pc,
      dataChannel: null,
      isInitiator
    };

    if (isInitiator) {
      conn.dataChannel = pc.createDataChannel("shardflow");
      wireDataChannel(conn.dataChannel, peerId);
    } else {
      pc.ondatachannel = (event) => {
        conn.dataChannel = event.channel;
        wireDataChannel(conn.dataChannel, peerId);
      };
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        // For now, we rely on trickle via your beacon or signaling;
        // you can extend this part later to serialize candidates.
        ShardFlowCore.log("ICE candidate for", peerId, event.candidate);
      }
    };

    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      ShardFlowCore.log("Connection state", peerId, s);
      if (s === "failed" || s === "disconnected" || s === "closed") {
        ShardFlowCore.unregisterPeer(peerId);
      }
    };

    ShardFlowCore.registerPeer(peerId, conn);
    return conn;
  }

  function wireDataChannel(dc, peerId) {
    dc.onopen = () => {
      ShardFlowCore.log("Data channel open", peerId);
    };
    dc.onclose = () => {
      ShardFlowCore.log("Data channel closed", peerId);
      ShardFlowCore.unregisterPeer(peerId);
    };
    dc.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        ShardFlowCore.handleIncomingMessage(msg);
      } catch (e) {
        console.error("Invalid ShardFlow message", e);
      }
    };
  }

  async function createOffer(peerId) {
    const conn = createPeerConnection(peerId, true);
    const pc = conn.pc;
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    return {
      peerId,
      offer: pc.localDescription
    };
  }

  async function acceptOffer(peerId, remoteOffer) {
    const conn = createPeerConnection(peerId, false);
    const pc = conn.pc;
    await pc.setRemoteDescription(new RTCSessionDescription(remoteOffer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    return {
      peerId,
      answer: pc.localDescription
    };
  }

  async function acceptAnswer(peerId, remoteAnswer) {
    const conn = ShardFlowCore.state.peers[peerId];
    if (!conn) throw new Error("No peer for answer: " + peerId);
    const pc = conn.pc;
    await pc.setRemoteDescription(new RTCSessionDescription(remoteAnswer));
  }

  return {
    createOffer,
    acceptOffer,
    acceptAnswer
  };
})();
