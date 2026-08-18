"use client";
import { cn } from "@/lib/utils";

const variants = {
  default: "bg-accent text-black hover:bg-accent-dark font-semibold",
  outline: "border border-border bg-transparent hover:bg-white/5 text-zinc-200",
  ghost: "bg-transparent hover:bg-white/5 text-zinc-300",
  danger: "bg-red-950/60 border border-red-900/60 text-red-300 hover:bg-red-900/60",
  subtle: "bg-card2 border border-border hover:bg-white/5 text-zinc-200",
};

const sizes = {
  default: "h-9 px-4 text-sm",
  sm: "h-8 px-3 text-xs",
  lg: "h-11 px-6 text-sm",
  icon: "h-8 w-8",
};

export function Button({ className, variant = "default", size = "default", disabled, children, ...props }) {
  return (
    <button
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg transition-colors duration-150",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
