import Footer from "@/components/footer";
import Header from "@/components/header";
import { NotFoundHero } from "@/components/not-found-hero";

export default function NotFound() {
  return (
    <div className="bg-background text-foreground relative min-h-dvh">
      <Header />

      <main className="mx-auto flex min-h-[74dvh] w-full max-w-6xl items-center px-6 pt-32 pb-14 lg:px-12">
        <NotFoundHero />
      </main>

      <Footer />
    </div>
  );
}
