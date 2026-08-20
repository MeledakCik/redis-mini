"use client";
// REDESIGN 2030: "All buttons ripple on click" — lightweight hook, no extra deps.
import { useCallback, useState } from "react";

export function useRipple() {
  const [ripples, setRipples] = useState([]);

  const addRipple = useCallback((e) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.8;
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    const id = `${Date.now()}-${Math.random()}`;
    setRipples((prev) => [...prev, { id, x, y, size }]);
    window.setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 620);
  }, []);

  return { ripples, addRipple };
}
