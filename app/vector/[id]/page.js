"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Legacy standalone route, kept alive so old vector.kasyaf.id/vector/[id] links
// (proxied through nginx) still resolve. It just forwards into the unified
// dashboard's Vector tab instead of rendering its own separate page.
export default function VectorDetailRedirect({ params }) {
  const router = useRouter();

  useEffect(() => {
    router.replace(`/databases/${params.id}?type=vector`);
  }, [router, params.id]);

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center text-sm text-zinc-500">
      Membuka dashboard terpadu...
    </div>
  );
}
