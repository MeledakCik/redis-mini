import { NextResponse } from "next/server";
import { readVectorInstances, readVectorInstancesForUser, upsertVectorInstance } from "@/lib/vector-store";
import { getProvider, DEPLOYMENT_MODE } from "@/lib/infra";
import { createCollection, getCollectionInfo, isQdrantReachable } from "@/lib/qdrant";
import { resolvePublicQdrantEndpoint } from "@/lib/qdrant-public-host";
import { generateId, generatePassword } from "@/lib/generate";
import { requireUser, authErrorResponse } from "@/lib/auth-guard";
import { checkRateLimit } from "@/lib/rate-limit";
import { canCreateInstance, limitResponse } from "@/lib/quota";

const ALLOWED_DIMENSIONS = [384, 768, 1536];
const ALLOWED_METRICS = ["cosine", "dot", "euclidean"];

export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    return authErrorResponse(err);
  }

  const db = readVectorInstancesForUser(user.id);
  const qdrantUp = await isQdrantReachable();

  const result = await Promise.all(
    db.map(async (inst) => {
      let pointsCount = 0;
      let status = qdrantUp ? "unknown" : "not_found";
      if (qdrantUp) {
        try {
          const info = await getCollectionInfo(inst.name);
          pointsCount = info?.result?.points_count ?? 0;
          status = info?.result?.status === "green" || info?.result?.status === "yellow" ? "running" : "exited";
        } catch {
          status = "not_found";
        }
      }
      return { ...inst, status, pointsCount };
    })
  );

  return NextResponse.json({
    instances: result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    deploymentMode: DEPLOYMENT_MODE,
  });
}

export async function POST(req) {
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    return authErrorResponse(err);
  }

  // Task 3: free tier = 1 Vector database per akun.
  const quota = canCreateInstance(user.id, "vector", user.email);
  if (!quota.allowed) {
    return NextResponse.json(limitResponse(quota.reason, { count: quota.count }), { status: 403 });
  }

  const rl = await checkRateLimit("vector:create", user.id);
  if (!rl.allowed) return rl.response;

  const provider = getProvider();

  const body = await req.json().catch(() => ({}));
  const dimension = ALLOWED_DIMENSIONS.includes(Number(body.dimension)) ? Number(body.dimension) : 1536;
  const metric = ALLOWED_METRICS.includes(body.metric) ? body.metric : "cosine";
  const name = (body.name && String(body.name).trim()) || generateId(8);

  try {
    // Mode docker: spawn/pastikan container Qdrant lokal jalan.
    // Mode external: cuma validasi QDRANT_URL keisi, gak spawn apa pun (Railway gak punya
    // Docker daemon) — vector DB-nya connect ke Qdrant eksternal (Qdrant Cloud, VPS lain, dst).
    await provider.ensureVectorBackend();
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Gagal menyiapkan backend Qdrant: " + (err.message || "unknown error") },
      { status: 500 }
    );
  }

  // Nama collection Qdrant harus unik lintas SEMUA user (satu Qdrant dipakai bersama)
  const db = readVectorInstances();
  if (db.some((i) => i.name === name)) {
    return NextResponse.json({ error: `Vector database dengan nama "${name}" sudah ada.` }, { status: 409 });
  }

  try {
    await createCollection(name, dimension, metric);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Gagal membuat collection di Qdrant" }, { status: 500 });
  }

  // Host/port publik yang ditampilkan ke customer (connection string, curl example, dst).
  // Sebelumnya hardcode "external"/null di mode external — sekarang selalu resolve dari
  // QDRANT_HOST / QDRANT_PUBLIC_URL (fallback 127.0.0.1:6333), jadi gak pernah lagi tampil
  // "qdrant://default:token@external:null/name" yang jelas gak connectable.
  const { host: publicHost, port: publicPort } = resolvePublicQdrantEndpoint();

  const instance = {
    id: name,
    userId: user.id,
    name,
    dimension,
    metric,
    provider: provider.mode,
    region: "ID-JKT-1",
    tls: false,
    host: publicHost,
    port: publicPort,
    token: generatePassword(24),
    createdAt: new Date().toISOString(),
  };

  upsertVectorInstance(instance);
  return NextResponse.json({ instance }, { status: 201 });
}
