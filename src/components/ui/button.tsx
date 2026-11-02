import type { ComponentProps } from "react";

import { cx } from "@/lib/cx";

type Variant = "default" | "primary" | "ghost";
type Size = "sm" | "md" | "icon" | "icon-sm";

const BASE =
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md font-medium transition-colors disabled:pointer-events-none disabled:opacity-40";

const VARIANTS: Record<Variant, string> = {
  default: "border border-border bg-surface text-text-primary hover:bg-surface-secondary",
  primary: "bg-primary text-on-primary hover:bg-primary-hover",
  ghost: "text-text-secondary hover:bg-surface-secondary hover:text-text-primary",
};

const SIZES: Record<Size, string> = {
  sm: "h-7 px-2 text-xs",
  md: "h-9 px-3 text-sm",
  icon: "size-9",
  "icon-sm": "size-7",
};

export interface ButtonProps extends ComponentProps<"button"> {
  variant?: Variant;
  size?: Size;
}

/** A button in DabMusic's palette. `type` defaults to "button", so it never submits a form. */
export function Button({ variant = "default", size = "md", className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={cx(BASE, VARIANTS[variant], SIZES[size], className)} {...props} />;
}
