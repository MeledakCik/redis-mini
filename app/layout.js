import "./globals.css";
import { Providers } from "./providers";

export const metadata = {
  title: "Redis UTS · Managed Redis Provider",
  description: "Redis Cloud by UTS — provisioning Redis database dengan isolasi ACL, siap pakai dalam satu klik.",
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
