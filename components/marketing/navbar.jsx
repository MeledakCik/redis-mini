"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { Database, Boxes, KeyRound, DollarSign, Menu, LogIn } from "lucide-react";
import { RadialFab } from "@/components/radial-fab";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Vector", href: "#compatibility" },
  { label: "API", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
];

export function Navbar({ isLoggedIn }) {
  return (
    <>
      {/* Desktop / tablet floating pill navbar */}
      <motion.nav
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-5 left-1/2 -translate-x-1/2 z-50 h-14 px-3 rounded-full bg-black/60 backdrop-blur-2xl border border-white/10 flex items-center gap-1 w-[min(92vw,720px)] justify-between"
      >
        <Link href="/" className="flex items-center gap-2 pl-1.5 shrink-0">
          <span className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-black font-display font-bold text-sm">
            K
          </span>
          <span className="hidden sm:inline font-display font-semibold text-sm text-white tracking-tight">
            Kasyaf
          </span>
        </Link>

        {/* RESPONSIVE FIX: menu tengah cuma tampil di layar lebar, mobile pakai radial FAB */}
        <div className="hidden md:flex items-center gap-6 text-sm text-zinc-300">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-white transition-colors">
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2 shrink-0">
          {isLoggedIn ? (
            <Link
              href="/databases"
              className="h-9 px-4 rounded-full bg-accent text-black text-sm font-semibold flex items-center shadow-[0_0_20px_rgba(0,224,149,0.4)] hover:bg-accent-dark transition-colors"
            >
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="h-9 px-4 rounded-full text-sm text-zinc-300 hover:text-white transition-colors flex items-center"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="h-9 px-4 rounded-full bg-accent text-black text-sm font-semibold flex items-center shadow-[0_0_20px_rgba(0,224,149,0.4)] hover:bg-accent-dark transition-colors"
              >
                Get Started
              </Link>
            </>
          )}
        </div>

        {/* mobile: compact CTA, full menu lives in the radial FAB */}
        <Link
          href={isLoggedIn ? "/databases" : "/register"}
          className="md:hidden h-9 px-3.5 rounded-full bg-accent text-black text-xs font-semibold flex items-center shrink-0"
        >
          {isLoggedIn ? "Dashboard" : "Get Started"}
        </Link>
      </motion.nav>

      {/* RESPONSIVE FIX: mobile radial FAB menu, no hamburger */}
      <RadialFab
        triggerIcon={Menu}
        position="bottom-center"
        items={[
          { label: "Features", icon: Boxes, onClick: () => scrollToId("features") },
          { label: "Vector", icon: Database, onClick: () => scrollToId("compatibility") },
          { label: "API", icon: KeyRound, onClick: () => scrollToId("how-it-works") },
          { label: "Pricing", icon: DollarSign, onClick: () => scrollToId("pricing") },
          {
            label: isLoggedIn ? "Dashboard" : "Login",
            icon: LogIn,
            onClick: () => {
              window.location.href = isLoggedIn ? "/databases" : "/login";
            },
          },
        ]}
      />
    </>
  );
}

function scrollToId(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}
