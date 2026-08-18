// Parser sederhana buat "bahasa command" Vector ala Upstash CLI

function stripQuotes(s) {
  if (!s) return s;
  const trimmed = s.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseId(raw) {
  const id = stripQuotes(raw);
  // kalau "1", "42" -> jadi angka 1, 42 biar Qdrant mau (unsigned integer)
  if (/^\d+$/.test(id)) {
    return parseInt(id, 10);
  }
  // kalau UUID atau string lain, biarin string
  return id;
}

export function convertFilterToQdrant(filterObj) {
  if (!filterObj || typeof filterObj!== "object") return null;
  const entries = Object.entries(filterObj);
  if (entries.length === 0) return null;
  return { must: entries.map(([key, value]) => ({ key, match: { value } })) };
}

export function parseVectorCommand(raw) {
  const trimmed = (raw || "").trim();
  if (!trimmed) throw new Error("Command kosong");

  const firstSpace = trimmed.indexOf(" ");
  const command = (firstSpace === -1? trimmed : trimmed.slice(0, firstSpace)).toUpperCase();
  const rest = (firstSpace === -1? "" : trimmed.slice(firstSpace + 1)).trim();

  switch (command) {
    case "UPSERT": {
      const m = rest.match(/^(?:"([^"]+)"|'([^']+)'|(\S+))\s+(\[[\s\S]*?\])\s*(\{[\s\S]*\})?\s*$/);
      if (!m) throw new Error('Format: UPSERT <id> [v1,v2,...] {"key":"value"} (optional metadata)');
      const rawId = m[1] || m[2] || m[3];
      const id = parseId(rawId);
      let vector, metadata;
      try {
        vector = JSON.parse(m[4]);
      } catch {
        throw new Error("Vector harus array angka valid, contoh: [0.1, 0.2, 0.3]");
      }
      try {
        metadata = m[5]? JSON.parse(m[5]) : {};
      } catch {
        throw new Error("Metadata harus JSON object valid");
      }
      if (!Array.isArray(vector) || vector.some((v) => typeof v!== "number")) {
        throw new Error("Vector harus array of number");
      }
      return { command, id, vector, metadata };
    }

    case "QUERY": {
      const m = rest.match(/^(\[[\s\S]*?\])(?:\s+TOPK\s+(\d+))?(?:\s+FILTER\s+(\{[\s\S]*\}))?\s*$/i);
      if (!m) throw new Error("Format: QUERY [v1,v2,...] TOPK 5 FILTER {\"key\":\"value\"} (optional)");
      let vector, filterObj;
      try {
        vector = JSON.parse(m[1]);
      } catch {
        throw new Error("Vector harus array angka valid");
      }
      const topK = m[2]? parseInt(m[2], 10) : 10;
      try {
        filterObj = m[3]? JSON.parse(m[3]) : null;
      } catch {
        throw new Error("FILTER harus JSON object valid");
      }
      return { command, vector, topK, filter: convertFilterToQdrant(filterObj) };
    }

    case "DELETE": {
      if (!rest) throw new Error("Format: DELETE <id> atau DELETE ALL");
      if (rest.trim().toUpperCase() === "ALL") return { command, all: true };
      return { command, id: parseId(rest) };
    }

    case "FETCH": {
      if (!rest) throw new Error("Format: FETCH <id>");
      return { command, id: parseId(rest) };
    }

    case "RANGE": {
      // support: RANGE 20, RANGE LIMIT 20, RANGE 0 LIMIT 20
      const m = rest.match(/^(?:(\d+)\s+)?(?:LIMIT\s+)?(\d+)?\s*$/i);
      let offset = null;
      let limit = 20;
      if (m) {
        if (m[1] && m[2]) {
          offset = Number(m[1]);
          limit = Number(m[2]);
        } else if (m[1]) {
          limit = Number(m[1]);
        } else if (m[2]) {
          limit = Number(m[2]);
        }
      }
      return { command, offset, limit };
    }

    case "PING":
      return { command };

    default:
      throw new Error(`Command "${command}" tidak dikenali. Tersedia: UPSERT, QUERY, DELETE, FETCH, RANGE, PING.`);
  }
}