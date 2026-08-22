import { FileWarning } from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { ComingSoon } from "@/components/coming-soon";

export default function InsightsPage() {
  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 min-w-0">
        <Header breadcrumbs={["Slow Logs"]} />
        <main className="max-w-6xl mx-auto px-4 md:px-6 py-8 pb-28 lg:pb-8 space-y-6">
          <div>
            <h1 className="text-xl font-bold text-zinc-100">Slow Logs</h1>
            <p className="text-sm text-zinc-500 mt-1">Top keys & command paling lambat di database kamu.</p>
          </div>
          <ComingSoon
            icon={FileWarning}
            title="Belum ada slow log"
            description="Command yang butuh waktu lebih lama dari threshold akan muncul di sini begitu ada traffic."
          />
        </main>
      </div>
    </div>
  );
}
