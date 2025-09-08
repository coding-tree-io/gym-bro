import * as React from "react";
import { cn } from "@/lib/utils";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "destructive" | "outline" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
};

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  default:
    "bg-brand-black text-white hover:bg-brand-grayDark disabled:opacity-50 disabled:pointer-events-none",
  secondary:
    "bg-brand-cream text-brand-black hover:bg-[#E2D3B9] disabled:opacity-50 disabled:pointer-events-none",
  destructive:
    "bg-brand-red text-white hover:bg-[#BF3E31] disabled:opacity-50 disabled:pointer-events-none",
  outline:
    "border border-brand-grayLight bg-transparent hover:bg-brand-cream text-brand-black disabled:opacity-50 disabled:pointer-events-none",
  ghost:
    "bg-transparent hover:bg-brand-cream text-brand-black disabled:opacity-50 disabled:pointer-events-none",
  link: "bg-transparent underline-offset-4 hover:underline text-brand-gold",
};

const sizeClasses: Record<NonNullable<ButtonProps["size"]>, string> = {
  default: "h-10 px-4 py-2",
  sm: "h-9 px-3",
  lg: "h-11 px-6",
  icon: "h-10 w-10",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 disabled:cursor-not-allowed",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export default Button;
