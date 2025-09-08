import * as React from "react";
import { cn } from "@/lib/utils";

// Simple Dialog implementation inspired by shadcn/ui API
// Provides: Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle,
// DialogDescription, DialogFooter, DialogClose

type DialogContextValue = {
  open: boolean;
  setOpen: (v: boolean) => void;
};

const DialogContext = React.createContext<DialogContextValue | null>(null);

export type DialogProps = React.PropsWithChildren<{
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}>;

export function Dialog({ open: openProp, defaultOpen, onOpenChange, children }: DialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState<boolean>(defaultOpen ?? false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? Boolean(openProp) : uncontrolledOpen;

  const setOpen = (v: boolean) => {
    if (!isControlled) setUncontrolledOpen(v);
    onOpenChange?.(v);
  };

  const value = React.useMemo(() => ({ open, setOpen }), [open]);

  return <DialogContext.Provider value={value}>{children}</DialogContext.Provider>;
}

export type DialogTriggerProps = React.PropsWithChildren<{
  asChild?: boolean;
}> & React.ButtonHTMLAttributes<HTMLButtonElement>;

export function DialogTrigger({ asChild, children, ...props }: DialogTriggerProps) {
  const ctx = React.useContext(DialogContext);
  if (!ctx) return null;

  const handleClick: React.MouseEventHandler<any> = (e) => {
    // preserve any provided onClick on child element if present
    if (React.isValidElement(children)) {
      const childOnClick = (children as any).props?.onClick;
      if (typeof childOnClick === "function") childOnClick(e);
    }
    if (!e.defaultPrevented) ctx.setOpen(true);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      ...props,
      onClick: handleClick,
    });
  }

  return (
    <button type="button" {...props} onClick={handleClick}>
      {children}
    </button>
  );
}

export type DialogContentProps = React.HTMLAttributes<HTMLDivElement> & {
  overlayClassName?: string;
};

export function DialogContent({ className, overlayClassName, children, ...props }: DialogContentProps) {
  const ctx = React.useContext(DialogContext);
  if (!ctx || !ctx.open) return null;

  const onBackdropClick: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (e.target === e.currentTarget) ctx.setOpen(false);
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center",
        overlayClassName
      )}
      onMouseDown={onBackdropClick}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div
        className={cn(
          "relative z-10 w-full max-w-lg rounded-lg border bg-white p-6 shadow-lg",
          className
        )}
        role="dialog"
        aria-modal="true"
        {...props}
      >
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4", className)} {...props} />;
}

export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-xl font-semibold", className)} {...props} />;
}

export function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-gray-500", className)} {...props} />;
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-6 flex items-center justify-end gap-3", className)} {...props} />;
}

export type DialogCloseProps = React.PropsWithChildren<{
  asChild?: boolean;
}> & React.ButtonHTMLAttributes<HTMLButtonElement>;

export function DialogClose({ asChild, children, ...props }: DialogCloseProps) {
  const ctx = React.useContext(DialogContext);
  if (!ctx) return null;

  const handleClick: React.MouseEventHandler<any> = (e) => {
    // preserve any provided onClick on child element if present
    if (React.isValidElement(children)) {
      const childOnClick = (children as any).props?.onClick;
      if (typeof childOnClick === "function") childOnClick(e);
    }
    if (!e.defaultPrevented) ctx.setOpen(false);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      ...props,
      onClick: handleClick,
    });
  }

  return (
    <button type="button" {...props} onClick={handleClick}>
      {children}
    </button>
  );
}

export default Dialog;
