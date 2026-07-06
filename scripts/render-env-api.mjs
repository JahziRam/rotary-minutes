/**
 * Safe Render env helpers — never bulk-PUT unless all vars are explicitly provided.
 * Bulk PUT removes any env var not included in the request body.
 */
const API = "https://api.render.com/v1";

export function createRenderApi(key) {
  async function api(path, opts = {}) {
    const res = await fetch(`${API}${path}`, {
      ...opts,
      signal: AbortSignal.timeout(60_000),
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        ...(opts.headers || {}),
      },
    });
    const text = await res.text();
    let body;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }
    if (!res.ok) {
      throw new Error(`${opts.method || "GET"} ${path} → ${res.status}: ${JSON.stringify(body)}`);
    }
    return body;
  }

  async function getOwnerId() {
    const owners = await api("/owners?limit=20");
    const entry = owners?.[0]?.owner || owners?.[0];
    const id = entry?.id || entry?.owner?.id;
    if (!id) throw new Error("No Render workspace found on this API key.");
    return id;
  }

  async function findService(ownerId, name) {
    const list = await api(`/services?ownerId=${ownerId}&limit=50`);
    for (const row of list || []) {
      const s = row.service || row;
      if (s.name === name) return s;
    }
    return null;
  }

  /** Update a single env var without touching others. */
  async function upsertEnvVar(serviceId, key, value) {
    await api(`/services/${serviceId}/env-vars/${encodeURIComponent(key)}`, {
      method: "PUT",
      body: JSON.stringify({ value }),
    });
  }

  async function triggerDeploy(serviceId) {
    return api(`/services/${serviceId}/deploys`, {
      method: "POST",
      body: JSON.stringify({ clearCache: "do_not_clear" }),
    });
  }

  return { api, getOwnerId, findService, upsertEnvVar, triggerDeploy };
}