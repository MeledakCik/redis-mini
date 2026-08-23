"use client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Archive, Lock } from "lucide-react";

export function BackupsPanel({
  subtext = (
    <>
      Di versi VPS/production nanti, fitur ini bisa jalanin <code className="mono">redis-cli --rdb</code> terjadwal
      dan simpan snapshot ke storage eksternal (S3, dsb).
    </>
  ),
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Archive size={14} className="text-accent" /> Backups
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center py-14">
        <Lock className="mx-auto text-zinc-700 mb-3" size={28} />
        <p className="text-sm text-zinc-400 font-medium">Fitur Backup belum tersedia di edisi lokal</p>
        <p className="text-xs text-zinc-600 mt-1 max-w-sm mx-auto">{subtext}</p>
        <Button variant="subtle" size="sm" className="mt-4" disabled>
          Upgrade to Pro
        </Button>
      </CardContent>
    </Card>
  );
}
