export default function TournamentLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="md:flex justify-center">
      <div className="md:max-w-5xl">{children}</div>
    </div>
  );
}
