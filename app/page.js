// BAGIAN A: Landing page publik di "/" — sebelum ini langsung redirect ke /databases
// bikin user bingung. Sekarang landing dulu, dashboard cuma sejauh klik CTA.
import { auth } from "@/lib/auth";
import { Navbar } from "@/components/marketing/navbar";
import { Hero } from "@/components/marketing/hero";
import { LogoMarquee } from "@/components/marketing/logo-marquee";
import { BentoFeatures } from "@/components/marketing/bento-features";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { Compatibility } from "@/components/marketing/compatibility";
import { StatsCounter } from "@/components/marketing/stats-counter";
import { FinalCta } from "@/components/marketing/final-cta";
import { Footer } from "@/components/marketing/footer";

export default async function LandingPage() {
  const session = await auth();
  const isLoggedIn = !!session?.user;

  return (
    <div className="min-h-screen bg-bg overflow-x-clip">
      <Navbar isLoggedIn={isLoggedIn} />
      <Hero isLoggedIn={isLoggedIn} />
      <LogoMarquee />
      <BentoFeatures />
      <HowItWorks />
      <Compatibility />
      <StatsCounter />
      <FinalCta isLoggedIn={isLoggedIn} />
      <Footer />
    </div>
  );
}
