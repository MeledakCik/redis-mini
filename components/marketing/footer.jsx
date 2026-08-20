import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] py-8 px-5 md:px-8">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div className="flex items-center gap-2">
          <span className="h-6 w-6 rounded-full bg-accent flex items-center justify-center text-black font-display font-bold text-xs">
            K
          </span>
          <span className="text-sm text-zinc-400">
            Kasyaf Redis Cloud <span className="text-zinc-600">by Cikawan</span>
          </span>
        </div>
        <p className="text-xs text-zinc-600 font-mono">console.kasyaf.id</p>
        <div className="flex items-center gap-5 text-xs text-zinc-500">
          <Link href="/login" className="hover:text-accent transition-colors">
            Login
          </Link>
          <Link href="/register" className="hover:text-accent transition-colors">
            Register
          </Link>
          <a href="#features" className="hover:text-accent transition-colors">
            Features
          </a>
        </div>
      </div>
    </footer>
  );
}
