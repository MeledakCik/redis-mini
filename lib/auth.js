import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getUserByEmail } from "@/lib/users-store";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";

const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
const AUTH_SECRET_VALUE = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;

if (!AUTH_SECRET_VALUE && process.env.NODE_ENV === "production" &&!isBuildPhase) {
  throw new Error("AUTH_SECRET wajib diisi");
}

if (!AUTH_SECRET_VALUE) {
  process.env.AUTH_SECRET = "dummy-build-secret-only-replace-in-runtime-1234567890";
} else {
  process.env.AUTH_SECRET = AUTH_SECRET_VALUE;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function getAllowedEmails() {
  const raw = String(process.env.ALLOWED_EMAILS || "").trim();
  if (!raw || raw === "*") return null;
  return raw.split(",").map(e => normalizeEmail(e)).filter(Boolean);
}

function getAllowedDomains() {
  const raw = String(process.env.ALLOWED_DOMAINS || "").trim();
  if (!raw || raw === "*") return null;
  return raw.split(",").map(d => d.trim().toLowerCase()).filter(Boolean);
}

function isEmailWhitelisted(rawEmail) {
  const email = normalizeEmail(rawEmail);
  if (!email) return false;
  const allowedEmails = getAllowedEmails();
  const allowedDomains = getAllowedDomains();
  const adminEmail = normalizeEmail(process.env.ADMIN_EMAIL);
  if (allowedEmails === null && allowedDomains === null) return true;
  if (adminEmail && email === adminEmail) return true;
  if (allowedEmails && allowedEmails.includes(email)) return true;
  const domain = email.split("@")[1] || "";
  if (allowedDomains && domain && allowedDomains.includes(domain)) return true;
  return false;
}

function getClientIp(request) {
  if (!request) return "unknown";
  const xff = request.headers?.get?.("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const real = request.headers?.get?.("x-real-ip");
  if (real) return real;
  return "unknown";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
      checks: ["state"],
    }),
    GitHub({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
      allowDangerousEmailAccountLinking: true,
      checks: ["state"],
    }),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const email = String(credentials?.email || "").trim().toLowerCase();
        const password = String(credentials?.password || "");
        if (!email ||!password) return null;
        const ip = getClientIp(request);
        const rlKey = `login:${email}:${ip}`;
        const rl = checkRateLimit(rlKey, { max: 5, windowMs: 10 * 60 * 1000, lockoutMs: 15 * 60 * 1000 });
        if (!rl.allowed) return null;
        const user = getUserByEmail(email);
        if (!user) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;
        resetRateLimit(rlKey);
        return { id: user.id, email: user.email, provider: "credentials" };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" || account?.provider === "github") {
        if (!isEmailWhitelisted(user?.email)) {
          return "/unauthorized";
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id || user.email;
        token.email = user.email;
        token.name = user.name;
        token.image = user.image;
      }
      if (account?.provider) token.provider = account.provider;
      else if (!token.provider) token.provider = "credentials";
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.image = token.image;
        session.user.provider = token.provider;
      }
      return session;
    },
  },
});