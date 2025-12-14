import Footer from "@/components/footer";
import Header from "@/components/header";

export default function ({
  children,
  modal,
}: Readonly<{
  children: React.ReactNode;
  modal: React.ReactNode;
}>) {
  return (
    <div className="relative">
      <Header />
      <main className="max-w-dvw overflow-x-hidden">{children}</main>
      <Footer />
      {modal}
    </div>
  );
}
