import { cn } from "@/lib/utils";

export function Card({ className, children, ...props }) {
  return (
    <div className={cn("bg-card2 border border-border rounded-xl shadow-card", className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }) {
  return (
    <div
      className={cn(
        "px-4 md:px-5 py-3.5 md:py-4 border-b border-border flex items-center justify-between gap-2 flex-wrap",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }) {
  return (
    <h3 className={cn("text-sm font-semibold text-zinc-100", className)} {...props}>
      {children}
    </h3>
  );
}

export function CardContent({ className, children, ...props }) {
  return (
    <div className={cn("px-4 md:px-5 py-3.5 md:py-4", className)} {...props}>
      {children}
    </div>
  );
}
