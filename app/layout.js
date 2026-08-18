import "./globals.css";
import { Providers } from "./providers";

export const metadata = {
  title: "mini-upstash · Redis Console",
  description: "Local Redis-as-a-Service console, powered by Docker",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-bg text-zinc-100 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
