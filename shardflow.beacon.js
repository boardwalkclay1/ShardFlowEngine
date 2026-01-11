// shardflow.beacon.js
const ShardFlowBeacon = (() => {
  async function fetchJson(url) {
    if (!url) return null;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    try {
      return await res.json();
    } catch {
      return null;
    }
  }

  async function postJson(url, data) {
    if (!url) {
      console.warn("[ShardFlow] postJson called with no URL");
      return;
    }
    // Placeholder: you must wire this to something that can accept writes.
    // Could be a minimal backend, GitHub API call, or Cloudflare worker.
    // For now, we just log.
    console.warn("[ShardFlow] postJson requires implementation:", url, data);
  }

  return {
    fetchJson,
    postJson
  };
})();
