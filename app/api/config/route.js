import { NextResponse } from "next/server";
import { DEPLOYMENT_MODE, IS_DOCKER_AVAILABLE, IS_RAILWAY } from "@/lib/env";

// Endpoint publik (gak butuh login) — cuma expose mode deployment, bukan data sensitif.
// Dipakai frontend buat nentuin tampilan "Create Database" (Docker) vs
// "Connect External Redis" (external) tanpa harus nebak dari environment.
export async function GET() {
  return NextResponse.json({
    deploymentMode: DEPLOYMENT_MODE,
    dockerAvailable: IS_DOCKER_AVAILABLE,
    isRailway: IS_RAILWAY,
  });
}
