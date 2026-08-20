import { cn } from "@/lib/utils";

export function Card({ className, children, ...props }) {
  return (
    <div
      className={cn(
        // REDESIGN 2030: every card gets the same subtle lift + emerald border glow on hover
        "bg-card2 border border-border rounded-xl shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/30",
        className
      )}
      {...props}
    >
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
