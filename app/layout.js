import "./globals.css";
import { Providers } from "./providers";

const siteUrl = "https://console.kasyaf.id";
const title = "Kasyaf Redis Cloud | by Cikawan";
const description =
  "Kasyaf Redis Cloud - Managed Redis & Qdrant Vector DB Console by Cikawan (Kasyaf.id). Lightweight Upstash alternative, dark theme, fast.";

export const metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  keywords: [
    "Kasyaf",
    "Kasyaf Redis Cloud",
    "Cikawan",
    "Redis Cloud",
    "Qdrant",
    "Vector DB",
    "Upstash Alternative",
    "Redis Console",
  ],
  authors: [{ name: "Cikawan" }],
  creator: "Cikawan",
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    title,
    description,
    url: siteUrl,
    siteName: "Kasyaf Redis Cloud",
    images: ["/og-image.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/logo.png",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Kasyaf Redis Cloud",
  url: siteUrl,
  logo: `${siteUrl}/logo.png`,
  founder: {
    "@type": "Person",
    name: "Cikawan",
  },
  sameAs: ["https://kasyaf.id"],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="bg-bg text-zinc-100 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
