import { cn } from "@/lib/utils";

export default function LiveDot({
  className,
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        `relative flex items-center justify-center size-2.5`,
        className,
      )}
    >
      <div className="relative z-10 inline-block bg-green-500 size-full rounded-full" />
      <div className="absolute z-0 inline-block bg-green-300 size-full rounded-full animate-ping" />
      <div className="absolute z-0 inline-block bg-green-300 blur-lg size-full scale-105 rounded-full" />
    </div>
  );
}
