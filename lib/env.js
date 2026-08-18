import fs from "fs";

// Docker dianggap "tersedia" kalau:
//  - /var/run/docker.sock ada (dev lokal Axioo, VPS Ubuntu dengan Docker daemon), DAN
//  - kita TIDAK lagi di Railway (Railway gak punya Docker daemon walau socket-nya somehow ada).
export function detectDockerAvailable() {
  const onRailway = !!process.env.RAILWAY_ENVIRONMENT;
  if (onRailway) return false;
  try {
    return fs.existsSync("/var/run/docker.sock");
  } catch {
    return false;
  }
}

export const IS_DOCKER_AVAILABLE = detectDockerAvailable();

// DEPLOYMENT_MODE: "docker" | "external".
// Override manual lewat env DEPLOYMENT_MODE=docker|external, default "auto" -> ikut deteksi Docker.
function resolveDeploymentMode() {
  const raw = (process.env.DEPLOYMENT_MODE || "auto").toLowerCase();
  if (raw === "docker" || raw === "external") return raw;
  return IS_DOCKER_AVAILABLE ? "docker" : "external";
}

export const DEPLOYMENT_MODE = resolveDeploymentMode();

export const IS_RAILWAY = !!process.env.RAILWAY_ENVIRONMENT;
