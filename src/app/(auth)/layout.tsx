import Footer from "@/components/Footer";
import Particles, { FloatingTech } from "@/components/Particles";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Particles />
      <FloatingTech />
      <main className="auth-wrap">{children}</main>
      <Footer />
    </>
  );
}
