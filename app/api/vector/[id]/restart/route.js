import { NextResponse } from "next/server";
import { getVectorInstanceForUser } from "@/lib/vector-store";
import { getProvider } from "@/lib/infra";
import { requireUser, authErrorResponse } from "@/lib/auth-guard";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(_req, { params }) {
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    return authErrorResponse(err);
  }

  const inst = getVectorInstanceForUser(params.id, user.id);
  if (!inst) return NextResponse.json({ error: "Database not found" }, { status: 404 });

  const rl = await checkRateLimit("vector:restart", user.id, inst.id);
  if (!rl.allowed) return rl.response;

  try {
    const provider = getProvider();
    // Qdrant jalan sebagai satu backend bersama untuk semua vector DB (baik 1 container
    // Docker maupun 1 Qdrant eksternal), jadi restart di sini mempengaruhi semua vector DB.
    await provider.restartVectorBackend();
    const note =
      provider.mode === "external"
        ? "Backend Qdrant eksternal dikelola di luar aplikasi ini — tidak ada yang perlu di-restart di sisi kami."
        : "Container Qdrant di-restart (dipakai bersama semua vector DB).";
    return NextResponse.json({ success: true, note });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Gagal restart Qdrant" }, { status: 500 });
  }
}
