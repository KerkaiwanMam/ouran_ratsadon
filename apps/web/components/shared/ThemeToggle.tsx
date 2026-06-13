"use client";

import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

type Theme = "light" | "dark" | "system";

const OPTIONS: { value: Theme; icon: typeof Sun; label: string }[] = [
  { value: "light", icon: Sun, label: "โหมดสว่าง" },
  { value: "dark", icon: Moon, label: "โหมดมืด" },
  { value: "system", icon: Monitor, label: "ตามระบบ" },
];

function applyTheme(theme: Theme) {
  const isDark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", isDark);
}

export default function ThemeToggle() {
  // null until mounted — the inline script in app/layout.tsx already applied
  // the correct class before paint, so we read the stored preference once
  // client-side rather than guessing during SSR.
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme((localStorage.getItem("theme") as Theme | null) ?? "system");
  }, []);

  useEffect(() => {
    if (theme === null) return;
    applyTheme(theme);

    if (theme === "system") {
      localStorage.removeItem("theme");
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => applyTheme("system");
      mq.addEventListener("change", handleChange);
      return () => mq.removeEventListener("change", handleChange);
    }

    localStorage.setItem("theme", theme);
  }, [theme]);

  if (theme === null) {
    return <div className="w-[88px] h-[30px] rounded-lg bg-gray-50 dark:bg-gray-800" aria-hidden="true" />;
  }

  return (
    <div
      className="flex items-center gap-0.5 bg-gray-50 dark:bg-gray-800 rounded-lg p-1"
      role="group"
      aria-label="เลือกธีม"
    >
      {OPTIONS.map(({ value, icon: Icon, label }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            aria-label={label}
            aria-pressed={active}
            title={label}
            className={`p-1.5 rounded-md transition-colors duration-150 cursor-pointer ${
              active
                ? "bg-white dark:bg-gray-900 text-[#7F77DD] shadow-sm"
                : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            }`}
          >
            <Icon size={14} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
