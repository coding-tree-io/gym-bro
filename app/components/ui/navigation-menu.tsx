import * as React from "react"

import { cn } from "@/lib/utils"

const NavigationMenu = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("relative z-10 flex max-w-max flex-1 items-center justify-center", className)} {...props} />
))
NavigationMenu.displayName = "NavigationMenu"

const NavigationMenuList = React.forwardRef<
  HTMLUListElement,
  React.HTMLAttributes<HTMLUListElement>
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    className={cn("group flex flex-1 list-none items-center justify-center space-x-1", className)}
    {...props}
  />
))
NavigationMenuList.displayName = "NavigationMenuList"

const NavigationMenuItem = React.forwardRef<
  HTMLLIElement,
  React.LiHTMLAttributes<HTMLLIElement>
>(({ className, ...props }, ref) => (
  <li ref={ref} className={cn("relative", className)} {...props} />
))
NavigationMenuItem.displayName = "NavigationMenuItem"


const NavigationMenuLink = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, type = "button", ...props }, ref) => (
  <button
    ref={ref}
    type={type}
    className={cn(
      "block select-none rounded-md p-2 text-sm font-medium leading-none outline-none transition-colors hover:bg-brand-cream focus:bg-brand-cream",
      className
    )}
    {...props}
  />
))
NavigationMenuLink.displayName = "NavigationMenuLink"

export { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuLink }
