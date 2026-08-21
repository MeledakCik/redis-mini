import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import bcrypt from "bcryptjs";
import { getUserByEmail } from "@/lib/users-store";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";

const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

// NextAuth v5 by convention baca AUTH_SECRET, tapi .env project ini isinya
// NEXTAUTH_SECRET — fallback biar gak mismatch pas deploy.
const AUTH_SECRET_VALUE = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;

if (!AUTH_SECRET_VALUE && process.env.NODE_ENV === "production" && !isBuildPhase) {
  throw new Error(
    "AUTH_SECRET / NEXTAUTH_SECRET wajib diisi. Generate dengan: openssl rand -base64 32, lalu set di .env / environment variables."
  );
}

if (!AUTH_SECRET_VALUE) {
  if (!isBuildPhase) {
    console.warn(
      "[auth] AUTH_SECRET/NEXTAUTH_SECRET belum diisi — sesi login akan invalid tiap restart dev server."
    );
  }
  process.env.AUTH_SECRET = "dummy-build-secret-only-replace-in-runtime-1234567890";
} else {
  process.env.AUTH_SECRET = AUTH_SECRET_VALUE;
}

// --- Whitelist helpers (dipakai buat gate login Google & GitHub) ---
function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function getAllowedEmails() {
  return String(process.env.ALLOWED_EMAILS || "")
    .split(",")
    .map((e) => normalizeEmail(e))
    .filter(Boolean);
}

function getAllowedDomains() {
  return String(process.env.ALLOWED_DOMAINS || "")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
}

// Default deny: hanya lolos kalau match ADMIN_EMAIL, ALLOWED_EMAILS, atau ALLOWED_DOMAINS.
function isEmailWhitelisted(rawEmail) {
  const email = normalizeEmail(rawEmail);
  if (!email) return false;

  const adminEmail = normalizeEmail(process.env.ADMIN_EMAIL);
  if (adminEmail && email === adminEmail) return true;

  if (getAllowedEmails().includes(email)) return true;

  const domain = email.split("@")[1] || "";
  if (domain && getAllowedDomains().includes(domain)) return true;

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
    error: "/login", // NextAuth otomatis nambahin ?error=... ke path ini
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    GitHub({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
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
        if (!email || !password) return null;

        const ip = getClientIp(request);
        const rlKey = `login:${email}:${ip}`;

        // Max 5 percobaan gagal / 10 menit, kena lock 15 menit. Pesan ke client TETAP
        // generic ("email atau password salah") biar gak bocorin ke attacker apakah
        // dia kena lockout atau emailnya emang gak ada.
        const rl = checkRateLimit(rlKey, { max: 5, windowMs: 10 * 60 * 1000, lockoutMs: 15 * 60 * 1000 });
        if (!rl.allowed) {
          console.warn(
            `[auth] Login locked out: ${email} dari ${ip}, retry in ${Math.ceil(rl.retryAfterMs / 1000)}s`
          );
          return null;
        }

        const user = getUserByEmail(email);
        if (!user) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        resetRateLimit(rlKey); // sukses -> reset counter biar gak ke-lock gara-gara typo sebelumnya
        return { id: user.id, email: user.email, provider: "credentials" };
      },
    }),
  ],
  callbacks: {
    // Whitelist gate — hanya berlaku untuk OAuth (Google/GitHub).
    // Credentials provider sudah divalidasi sendiri di authorize() lewat users.json,
    // jadi gak perlu (dan gak boleh) di-double-gate di sini biar user lama gak ke-lock.
    async signIn({ user, account }) {
      if (account?.provider === "google" || account?.provider === "github") {
        if (!isEmailWhitelisted(user?.email)) {
          // return string path -> NextAuth v5 redirect langsung ke situ
          return "/unauthorized";
        }
      }
      return true;
    },

    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.image = user.image;
      }
      if (account?.provider) {
        token.provider = account.provider;
      } else if (!token.provider) {
        token.provider = "credentials";
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.image = token.image;
        session.user.provider = token.provider;
      }
      return session;
    },
  },
});
