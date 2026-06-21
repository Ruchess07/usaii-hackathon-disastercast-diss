"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

const navItems = [
  { href: "/", label: "City", step: "01" },
  { href: "/dashboard", label: "Cost of Inaction", step: "02" },
  { href: "/interventions", label: "Priorities", step: "03" },
  { href: "/compare", label: "Compare", step: "04" },
  { href: "/glossary", label: "Glossary", step: "05" },
];

const KEY_MAP: Record<string, string> = {
  "1": "/",
  "2": "/dashboard",
  "3": "/interventions",
  "4": "/compare",
  "5": "/glossary",
};

export function Nav() {
  const path = usePathname();
  const currentIdx = navItems.findIndex((n) => n.href === path);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const target = KEY_MAP[e.key];
      if (target && target !== path) {
        window.location.href = target;
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [path]);

  return (
    <nav className="sticky top-0 z-50 border-b border-[#EAEAEA] bg-white/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 md:px-8 h-14 flex items-center justify-between">
        <Link href="/" className="text-sm font-semibold text-[#1E293B] tracking-tight">
          DisasterCast
        </Link>
        <div className="flex items-center gap-6">
          {navItems.map((item, i) => {
            const isActive = path === item.href;
            const isPast = currentIdx > i;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`text-[11px] uppercase tracking-[0.1em] font-medium ${
                  isActive
                    ? "text-[#111]"
                    : isPast
                    ? "text-[#346538]"
                    : "text-[#787774] hover:text-[#1E293B]"
                }`}
              >
                <span className="hidden md:inline">{item.step} · </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
