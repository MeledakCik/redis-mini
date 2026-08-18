import { getProvider, QDRANT_PORT } from "@/lib/infra";

// Base URL Qdrant dinamis mengikuti provider aktif:
//  - DockerProvider  -> http://127.0.0.1:6333 (container lokal)
//  - ExternalProvider -> process.env.QDRANT_URL (Railway / Qdrant Cloud / VPS lain)
function baseUrl() {
  return getProvider().qdrantBaseUrl;
}

export function metricToQdrant(metric) {
  const map = { cosine: "Cosine", dot: "Dot", euclidean: "Euclid" };
  return map[metric] || "Cosine";
}

async function qFetch(path, options = {}) {
  const BASE_URL = baseUrl();
  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    });
  } catch (err) {
    const e = new Error(`Tidak bisa konek ke Qdrant di ${BASE_URL}. Pastikan Qdrant jalan (container lokal atau QDRANT_URL eksternal).`);
    e.isConnectionError = true;
    throw e;
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.status?.error || json?.error || `Qdrant error (HTTP ${res.status})`;
    throw new Error(msg);
  }
  return json;
}

export async function isQdrantReachable() {
  try {
    await qFetch("/collections");
    return true;
  } catch {
    return false;
  }
}

export async function createCollection(name, dimension, metric) {
  return qFetch(`/collections/${name}`, {
    method: "PUT",
    body: JSON.stringify({ vectors: { size: dimension, distance: metricToQdrant(metric) } }),
  });
}

export async function deleteCollection(name) {
  return qFetch(`/collections/${name}`, { method: "DELETE" });
}

export async function getCollectionInfo(name) {
  return qFetch(`/collections/${name}`);
}

export async function upsertPoints(name, points) {
  // points: [{ id, vector, payload }]
  return qFetch(`/collections/${name}/points?wait=true`, {
    method: "PUT",
    body: JSON.stringify({ points }),
  });
}

export async function searchPoints(name, vector, limit = 10, filter = null) {
  const body = { vector, limit, with_payload: true, with_vector: false };
  if (filter) body.filter = filter;
  return qFetch(`/collections/${name}/points/search`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function deletePoints(name, ids) {
  return qFetch(`/collections/${name}/points/delete?wait=true`, {
    method: "POST",
    body: JSON.stringify({ points: ids }),
  });
}

export async function retrievePoints(name, ids) {
  return qFetch(`/collections/${name}/points`, {
    method: "POST",
    body: JSON.stringify({ ids, with_payload: true, with_vector: true }),
  });
}

export async function scrollPoints(name, limit = 50, offset = null) {
  const body = { limit, with_payload: true, with_vector: true };
  if (offset !== null && offset !== undefined) body.offset = offset;
  return qFetch(`/collections/${name}/points/scroll`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
