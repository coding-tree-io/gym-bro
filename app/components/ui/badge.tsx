import * as React from "react";
import { cn } from "@/lib/utils";

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "secondary" | "destructive" | "outline";
};

const variants: Record<NonNullable<BadgeProps["variant"]>, string> = {
  default: "bg-brand-gold text-brand-black border-transparent",
  secondary: "bg-brand-cream text-brand-black border-transparent",
  destructive: "bg-brand-red text-white border-transparent",
  outline: "text-brand-black",
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "secondary", ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = "Badge";

export default Badge;
