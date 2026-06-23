import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Particles, { FloatingTech } from "@/components/Particles";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Particles />
      <FloatingTech />
      <Navbar />
      {children}
      <Footer />
    </>
  );
}
