import Footer from "@/components/footer";
import Header from "@/components/header";
import { NotFoundHero } from "@/components/not-found-hero";

export default function NotFound() {
  return (
    <div className="bg-background text-foreground relative min-h-dvh">
      <Header />

      <main className="page-container flex min-h-[74dvh] items-center pt-32 pb-14">
        <NotFoundHero />
      </main>

      <Footer />
    </div>
  );
}
