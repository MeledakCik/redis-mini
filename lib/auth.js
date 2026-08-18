import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getUserByEmail } from "@/lib/users-store";

// AUTH_SECRET wajib diisi di semua mode deployment (local/VPS/Railway) — tanpa ini
// NextAuth diam-diam pakai secret yang gak stabil antar restart/instance, sesi jadi
// gampang invalid dan (di production) itu security risk. Gagal cepat & jelas di boot.
if (!process.env.AUTH_SECRET && process.env.NODE_ENV === "production") {
  throw new Error(
    "AUTH_SECRET wajib diisi. Generate dengan: openssl rand -base64 32, lalu set di .env / environment variables."
  );
}
if (!process.env.AUTH_SECRET) {
  console.warn(
    "[auth] AUTH_SECRET belum diisi — sesi login akan invalid tiap restart dev server. Isi .env.local, generate dengan: openssl rand -base64 32"
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // WAJIB true untuk deploy di belakang reverse proxy (VPS + Nginx/Caddy) atau platform
  // managed (Railway) — host header yang app terima beda dari AUTH_URL kalau proxy nge-rewrite
  // atau kalau diakses lewat IP/domain custom yang beda dari default Railway. Tanpa ini
  // NextAuth v5 nolak semua request dengan "UntrustedHost" walau AUTH_SECRET/AUTH_URL benar.
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email || "").trim().toLowerCase();
        const password = String(credentials?.password || "");
        if (!email || !password) return null;

        const user = getUserByEmail(email);
        if (!user) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        // Object ini yang masuk ke jwt callback sebagai `user`
        return { id: user.id, email: user.email };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user) session.user.id = token.id;
      return session;
    },
  },
});
