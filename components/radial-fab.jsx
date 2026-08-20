"use client";
// RESPONSIVE FIX: pengganti hamburger menu di mobile — satu tombol bulat yang
// memuntahkan item menu dalam formasi busur (arc) 180 derajat ke atas.
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *  items: { label: string, icon?: any, onClick?: () => void, href?: string }[],
 *  triggerIcon: any,
 *  position?: "bottom-center" | "bottom-left",
 *  triggerClassName?: string,
 * }} props
 */
export function RadialFab({ items, triggerIcon: TriggerIcon, position = "bottom-center", triggerClassName }) {
  const [open, setOpen] = useState(false);
  const [radius, setRadius] = useState(100);

  // ANIMASI KASYAF: radius busur mengecil dikit di layar sangat sempit (<380px)
  useEffect(() => {
    function calc() {
      setRadius(window.innerWidth < 380 ? 82 : 100);
    }
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  const total = items.length;
  const positionClass =
    position === "bottom-left" ? "left-6" : "left-1/2 -translate-x-1/2";

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xl lg:hidden"
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      <div className={cn("fixed bottom-6 z-50 lg:hidden", positionClass)}>
        <AnimatePresence>
          {open &&
            items.map((item, index) => {
              const angle = (index / Math.max(total - 1, 1)) * 140 - 70;
              const rad = (angle * Math.PI) / 180;
              const x = Math.cos(rad) * radius * (position === "bottom-left" ? 1 : 1);
              const y = Math.sin(rad) * radius;
              const Icon = item.icon;
              return (
                <motion.button
                  key={item.label}
                  initial={{ opacity: 0, x: 0, y: 0, scale: 0.4 }}
                  animate={{ opacity: 1, x, y: -Math.abs(y), scale: 1 }}
                  exit={{ opacity: 0, x: 0, y: 0, scale: 0.4 }}
                  transition={{
                    type: "spring",
                    stiffness: 350,
                    damping: 18,
                    delay: index * 0.05,
                  }}
                  onClick={() => {
                    setOpen(false);
                    item.onClick?.();
                  }}
                  className="absolute bottom-0 left-0 h-12 w-12 rounded-full bg-white text-black shadow-[0_4px_20px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center gap-0.5"
                  title={item.label}
                >
                  {Icon && <Icon size={16} />}
                </motion.button>
              );
            })}
        </AnimatePresence>

        <motion.button
          onClick={() => setOpen((v) => !v)}
          whileTap={{ scale: 0.92 }}
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ type: "spring", stiffness: 350, damping: 18 }}
          className={cn(
            "relative h-14 w-14 rounded-full bg-white text-black shadow-[0_4px_24px_rgba(0,224,149,0.35)] flex items-center justify-center",
            triggerClassName
          )}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X size={22} /> : TriggerIcon ? <TriggerIcon size={22} /> : null}
        </motion.button>
      </div>
    </>
  );
}
