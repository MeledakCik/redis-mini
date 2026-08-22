import { Settings as SettingsIcon } from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { ComingSoon } from "@/components/coming-soon";

export default function SettingsPage() {
  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 min-w-0">
        <Header breadcrumbs={["Settings"]} />
        <main className="max-w-6xl mx-auto px-4 md:px-6 py-8 pb-28 lg:pb-8 space-y-6">
          <div>
            <h1 className="text-xl font-bold text-zinc-100">Settings</h1>
            <p className="text-sm text-zinc-500 mt-1">Preferensi akun & workspace kamu.</p>
          </div>
          <ComingSoon
            icon={SettingsIcon}
            title="Pengaturan akun segera hadir"
            description="Profile, notification preferences, dan danger zone akan tersedia di sini."
          />
        </main>
      </div>
    </div>
  );
}
