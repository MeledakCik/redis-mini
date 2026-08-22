import { Archive } from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { ComingSoon } from "@/components/coming-soon";

export default function BackupsPage() {
  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 min-w-0">
        <Header breadcrumbs={["Backups"]} />
        <main className="max-w-6xl mx-auto px-4 md:px-6 py-8 pb-28 lg:pb-8 space-y-6">
          <div>
            <h1 className="text-xl font-bold text-zinc-100">Backups</h1>
            <p className="text-sm text-zinc-500 mt-1">Snapshot otomatis database kamu.</p>
          </div>
          <ComingSoon
            icon={Archive}
            title="Belum ada snapshot"
            description="Snapshot otomatis akan berjalan begitu database kamu aktif — kamu bisa restore ke titik waktu manapun dari sini."
          />
        </main>
      </div>
    </div>
  );
}
