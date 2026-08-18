import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getUserByEmail } from "@/lib/users-store";

const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';

if (!process.env.AUTH_SECRET && process.env.NODE_ENV === "production" &&!isBuildPhase) {
  throw new Error(
    "AUTH_SECRET wajib diisi. Generate dengan: openssl rand -base64 32, lalu set di.env / environment variables."
  );
}

// Kalau kosong, set dummy dulu biar build lewat, runtime nanti Railway inject yang asli
if (!process.env.AUTH_SECRET) {
  if (!isBuildPhase) {
    console.warn(
      "[auth] AUTH_SECRET belum diisi — sesi login akan invalid tiap restart dev server. Isi.env.local, generate dengan: openssl rand -base64 32"
    );
  }
  process.env.AUTH_SECRET = "dummy-build-secret-only-replace-in-runtime-1234567890";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET,
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
        if (!email ||!password) return null;
        const user = getUserByEmail(email);
        if (!user) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;
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