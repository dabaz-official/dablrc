"use client";

import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";

const THEMES = ["light", "dark", "system"] as const;
type ThemeName = (typeof THEMES)[number];

const ICONS: Record<ThemeName, LucideIcon> = { light: Sun, dark: Moon, system: Monitor };

const subscribeNothing = () => () => {};

/** Cycles light, dark and system. Shows the system icon until mounted, so server and client agree. */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribeNothing, () => true, () => false);

  const current: ThemeName = mounted ? (THEMES.find((name) => name === theme) ?? "system") : "system";
  const next = THEMES[(THEMES.indexOf(current) + 1) % THEMES.length];
  const Icon = ICONS[current];

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      title={`Theme: ${current}`}
      aria-label={`Theme: ${current}. Switch to ${next}.`}
      onClick={() => setTheme(next)}
    >
      <Icon className="size-4" />
    </Button>
  );
}
