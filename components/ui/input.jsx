import { cn } from "@/lib/utils";

export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        "h-9 w-full rounded-lg bg-card border border-border px-3 text-sm text-zinc-200",
        "placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-accent/50 focus:border-accent/50",
        className
      )}
      {...props}
    />
  );
}
