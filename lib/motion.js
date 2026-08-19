// ANIMASI KASYAF: shared Framer Motion variants dipakai di seluruh landing + dashboard
// biar konsisten (satu sumber kebenaran timing/easing) dan gampang di-tune sekali tempat.

export const EASE_OUT = [0.22, 1, 0.36, 1];

// Reveal utama untuk card / list item — blur+rise, dipakai hampir di semua tempat.
export const cardReveal = {
  hidden: { opacity: 0, y: 60, filter: "blur(10px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.8, ease: EASE_OUT },
  },
};

// Parent wrapper buat stagger children yang pakai `cardReveal`.
export const staggerContainer = (stagger = 0.08, delay = 0) => ({
  hidden: {},
  show: {
    transition: { staggerChildren: stagger, delayChildren: delay },
  },
});

// Kinetic text reveal per-kata (dipakai di headline hero).
export const wordReveal = {
  hidden: { y: "100%" },
  show: { y: "0%", transition: { duration: 0.7, ease: EASE_OUT } },
};

export const wordStagger = (stagger = 0.06) => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger } },
});

// Page transition wrapper (AnimatePresence mode="wait" di consumer).
export const pageTransition = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE_OUT } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2, ease: EASE_OUT } },
};

// Image / panel clip reveal (left -> right wipe).
export const clipReveal = {
  hidden: { clipPath: "inset(0 100% 0 0)" },
  show: {
    clipPath: "inset(0 0% 0 0)",
    transition: { duration: 0.9, ease: EASE_OUT },
  },
};

// Empty state gentle float loop.
export const floatLoop = {
  animate: {
    y: [0, -6, 0],
    transition: { duration: 3, repeat: Infinity, ease: "easeInOut" },
  },
};
