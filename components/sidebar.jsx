"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard,
  Database,
  Boxes,
  HardDrive,
  BarChart3,
  KeyRound,
  CreditCard,
  Settings as SettingsIcon,
  BookOpen,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

// REVAMP: sidebar production-grade — nyambungin semua halaman yang udah ada
// (overview, backups, monitoring, billing custom-gateway) yang sebelumnya gak
// punya entry menu. Billing sekarang balik lagi karena custom payment gateway
// (Moota, bukan Midtrans) udah jalan di /billing — lihat app/billing/page.js.
const menu = [
  { label: "Overview", icon: LayoutDashboard, href: "/overview" },
  { label: "Databases", icon: Database, href: "/databases" },
  { label: "Vector", icon: Boxes, href: "/vector", badge: "Beta" },
  { label: "Backups", icon: HardDrive, href: "/backups" },
  { label: "Metrics & Logs", icon: BarChart3, href: "/monitoring" },
  { label: "API Keys", icon: KeyRound, href: "/connect" },
  { label: "Billing", icon: CreditCard, href: "/billing" },
  { label: "Settings", icon: SettingsIcon, href: "/settings" },
  {
    label: "Docs",
    icon: BookOpen,
    href: "https://github.com/MeledakCik/redis-mini/blob/main/docs/CLOUDFLARE_SETUP.md",
    external: true,
  },
];

function SidebarContent({ pathname, session, onNavigate }) {
  return (
    <>
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
          const isActive = !item.external && pathname?.startsWith(item.href);
          const linkProps = item.external
            ? { href: item.href, target: "_blank", rel: "noopener noreferrer" }
            : { href: item.href, onClick: onNavigate };
          const Comp = item.external ? "a" : Link;
          return (
            <Comp
              key={item.label}
              {...linkProps}
              className={cn(
                "relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                isActive
                  ? "text-accent font-medium"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-white/5"
              )}
            >
              {/* ANIMASI KASYAF: active indicator meluncur pakai layoutId */}
              {isActive && (
                <motion.span
                  layoutId="sidebar-active-indicator"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  className="absolute inset-0 bg-accent/10 rounded-lg"
                />
              )}
              <Icon size={15} className="relative shrink-0" />
              <span className="relative truncate">{item.label}</span>
              {item.badge && (
                <Badge variant="yellow" className="relative ml-auto shrink-0">
                  {item.badge}
                </Badge>
              )}
            </Comp>
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
    </>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar — RESPONSIVE FIX: cuma render di lg+, di bawahnya jadi drawer */}
      <aside className="hidden lg:flex w-56 shrink-0 border-r border-border bg-bg h-screen sticky top-0 flex-col">
        <SidebarContent pathname={pathname} session={session} />
      </aside>

      {/* Mobile: FAB trigger, posisi bottom-left biar gak nabrak tombol lain */}
      <motion.button
        onClick={() => setOpen(true)}
        whileTap={{ scale: 0.92 }}
        className="lg:hidden fixed bottom-6 left-6 z-40 h-14 w-14 rounded-full bg-white text-black shadow-[0_4px_24px_rgba(0,0,0,0.5)] flex items-center justify-center"
        aria-label="Open menu"
      >
        <Menu size={22} />
      </motion.button>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-xl"
              onClick={() => setOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 340, damping: 34 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 z-50 w-[78vw] max-w-[280px] bg-bg border-r border-border flex flex-col"
            >
              <button
                onClick={() => setOpen(false)}
                className="absolute top-3.5 right-3.5 text-zinc-500 hover:text-white"
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
              <SidebarContent pathname={pathname} session={session} onNavigate={() => setOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}