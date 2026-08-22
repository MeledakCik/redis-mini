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
  Activity,
  FileWarning,
  Archive,
  KeyRound,
  CreditCard,
  Settings,
  BookOpen,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronsLeft,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

// REVAMP: sidebar sekarang grouped (MAIN / OBSERVABILITY / ACCOUNT) biar terasa
// seperti dashboard infra pro (Vercel/Linear), bukan cuma 3 link nyasar.
const groups = [
  {
    label: "Main",
    items: [
      { label: "Overview", icon: LayoutDashboard, href: "/overview" },
      { label: "Databases", icon: Database, href: "/databases" },
      { label: "Vector", icon: Boxes, href: "/vector" },
    ],
  },
  {
    label: "Observability",
    items: [
      { label: "Monitoring", icon: Activity, href: "/monitoring" },
      { label: "Slow Logs", icon: FileWarning, href: "/insights" },
      { label: "Backups", icon: Archive, href: "/backups" },
    ],
  },
  {
    label: "Account",
    items: [
      { label: "API Keys", icon: KeyRound, href: "/connect" },
      { label: "Usage & Billing", icon: CreditCard, href: "/billing" },
      { label: "Settings", icon: Settings, href: "/settings" },
      { label: "Docs", icon: BookOpen, href: "https://docs.kasyaf.id", external: true },
    ],
  },
];

function NavLink({ item, isActive, collapsed, onNavigate }) {
  const Icon = item.icon;
  const content = (
    <>
      {isActive && (
        <motion.span
          layoutId="sidebar-active-indicator"
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
          className="absolute inset-0 bg-accent/10 rounded-lg"
        />
      )}
      <Icon size={15} className="relative shrink-0" />
      {!collapsed && <span className="relative truncate">{item.label}</span>}
    </>
  );

  const className = cn(
    "relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
    collapsed && "justify-center px-0 w-9 mx-auto",
    isActive ? "text-accent font-medium" : "text-zinc-400 hover:text-zinc-100 hover:bg-white/5"
  );

  if (item.external) {
    return (
      <a href={item.href} target="_blank" rel="noopener noreferrer" className={className} title={collapsed ? item.label : undefined}>
        {content}
      </a>
    );
  }

  return (
    <Link href={item.href} onClick={onNavigate} className={className} title={collapsed ? item.label : undefined}>
      {content}
    </Link>
  );
}

function SidebarContent({ pathname, session, onNavigate, collapsed, onToggleCollapse }) {
  return (
    <>
      <div className={cn("h-14 flex items-center gap-2 border-b border-border shrink-0", collapsed ? "justify-center px-2" : "px-4")}>
        <Image src="/logo.png" alt="Kasyaf Redis Cloud" width={32} height={32} className="h-8 w-8 object-contain shrink-0" />
        {!collapsed && (
          <div className="flex flex-col leading-tight min-w-0">
            <span className="font-semibold text-sm tracking-tight text-zinc-100 truncate">Kasyaf Redis Cloud</span>
            <span className="text-[10px] text-zinc-500 opacity-70">by Cikawan</span>
          </div>
        )}
      </div>

      <nav className="flex-1 py-3 px-2 space-y-4 overflow-y-auto no-scrollbar">
        {groups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="px-3 mb-1 text-[10px] font-semibold tracking-wider text-zinc-600 uppercase">{group.label}</p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.label}
                  item={item}
                  collapsed={collapsed}
                  isActive={!item.external && pathname?.startsWith(item.href)}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Desktop-only collapse toggle */}
      {onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex items-center justify-center gap-2 mx-2 mb-2 h-8 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors text-xs"
        >
          <ChevronsLeft size={14} className={cn("transition-transform", collapsed && "rotate-180")} />
          {!collapsed && "Collapse"}
        </button>
      )}

      <div className="border-t border-border shrink-0">
        {session?.user?.email && (
          <div className={cn("pt-3 pb-1.5 flex items-center gap-2", collapsed ? "justify-center px-2" : "justify-between px-3")}>
            {!collapsed && (
              <span className="text-[11px] text-zinc-400 truncate" title={session.user.email}>
                {session.user.email}
              </span>
            )}
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="shrink-0 text-zinc-500 hover:text-red-400 transition-colors"
              title="Logout"
            >
              <LogOut size={13} />
            </button>
          </div>
        )}
        {!collapsed && <div className="px-3 pb-3 pt-1 text-[11px] text-zinc-600">Kasyaf Redis Cloud · by Cikawan</div>}
      </div>
    </>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* Desktop sidebar — collapsible between 224px and 68px */}
      <aside
        className={cn(
          "hidden lg:flex shrink-0 border-r border-border bg-bg h-screen sticky top-0 flex-col transition-all duration-200",
          collapsed ? "w-[68px]" : "w-56"
        )}
      >
        <SidebarContent
          pathname={pathname}
          session={session}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((c) => !c)}
        />
      </aside>

      {/* Mobile: FAB trigger */}
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
              <SidebarContent pathname={pathname} session={session} onNavigate={() => setOpen(false)} collapsed={false} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
