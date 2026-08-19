"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Database, Boxes, CreditCard, KeyRound, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

const menu = [
  { label: "Databases", icon: Database, href: "/databases" },
  { label: "Vector", icon: Boxes, href: "/vector" },
  { label: "API Keys", icon: KeyRound, href: "/connect" },
  { label: "Billing", icon: CreditCard, href: "/billing" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <aside className="w-56 shrink-0 border-r border-border bg-bg h-screen sticky top-0 flex flex-col">
      <div className="h-14 flex items-center gap-2 px-4 border-b border-border">
        <Image src="/logo.png" alt="Kasyaf Redis Cloud" width={32} height={32} className="h-8 w-8 object-contain shrink-0" />
        <div className="flex flex-col leading-tight min-w-0">
          <span className="font-semibold text-sm tracking-tight text-zinc-100 truncate">Kasyaf Redis Cloud</span>
          <span className="text-[10px] text-zinc-500 opacity-70">by Cikawan</span>
        </div>
      </div>

      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {menu.map((item) => {
          const Icon = item.icon;
          const isActive = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                isActive
                  ? "bg-accent/10 text-accent font-medium"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-white/5"
              )}
            >
              <Icon size={15} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border">
        {session?.user?.email && (
          <div className="px-3 pt-3 pb-1.5 flex items-center justify-between gap-2">
            <span className="text-[11px] text-zinc-400 truncate" title={session.user.email}>
              {session.user.email}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="shrink-0 text-zinc-500 hover:text-red-400 transition-colors"
              title="Logout"
            >
              <LogOut size={13} />
            </button>
          </div>
        )}
        <div className="px-3 pb-3 pt-1 text-[11px] text-zinc-600">Kasyaf Redis Cloud · by Cikawan</div>
      </div>
    </aside>
  );
}
