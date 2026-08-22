"use client";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { floatLoop } from "@/lib/motion";

// REVAMP: dipakai untuk section observability/account yang scaffold-nya sudah ada
// (routing + sidebar) tapi backend datanya belum dikoneksikan.
export function ComingSoon({ icon: Icon, title, description }) {
  return (
    <Card className="py-20 px-4 text-center border-dashed">
      <motion.div {...floatLoop}>
        <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-white/5 border border-border flex items-center justify-center">
          <Icon className="text-zinc-500" size={22} />
        </div>
      </motion.div>
      <p className="text-zinc-200 font-semibold">{title}</p>
      <p className="text-zinc-600 text-sm mt-1.5 max-w-sm mx-auto">{description}</p>
    </Card>
  );
}
