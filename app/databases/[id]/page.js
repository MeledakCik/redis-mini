"use client";
import { useSearchParams } from "next/navigation";
import { UnifiedConsole } from "@/components/unified-console";

// Subdomain unification (nginx.conf is NOT edited here, config lives server-side):
// - console.kasyaf.id/databases/[id]  -> this page, Redis tab default
// - console.kasyaf.id/databases/[id]?type=vector -> this page, Vector tab default
// - vector.kasyaf.id/*  -> nginx: 302 redirect to https://console.kasyaf.id/vector
//   (old Qdrant dashboard subdomain folds into the unified console instead of
//   serving its own separate white/unstyled UI)
export default function UnifiedDatabasePage({ params }) {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("type") === "vector" ? "vector" : "redis";
  return <UnifiedConsole id={params.id} initialTab={initialTab} />;
}
