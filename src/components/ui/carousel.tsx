import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type CarouselProps = React.HTMLAttributes<HTMLDivElement> & {
  onPrev?: () => void;
  onNext?: () => void;
};

export function Carousel({ className, children, onPrev, onNext, ...props }: CarouselProps) {
  return (
    <div className={cn("relative", className)} {...props}>
      {children}
      <CarouselPrevious onClick={onPrev} />
      <CarouselNext onClick={onNext} />
    </div>
  );
}

export function CarouselContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-start transition-transform duration-200 ease-out",
        className
      )}
      {...props}
    />
  );
}

export function CarouselItem({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("shrink-0", className)} {...props} />;
}

export function CarouselPrevious({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <Button
      type="button"
      variant="secondary"
      size="icon"
      className={cn(
        "absolute left-2 top-1/2 -translate-y-1/2 z-10 rounded-full shadow hover:shadow-md",
        className
      )}
      aria-label="Previous"
      {...props}
    >
      {/* simple chevron left */}
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M15 18l-6-6 6-6"/></svg>
    </Button>
  );
}

export function CarouselNext({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <Button
      type="button"
      variant="secondary"
      size="icon"
      className={cn(
        "absolute right-2 top-1/2 -translate-y-1/2 z-10 rounded-full shadow hover:shadow-md",
        className
      )}
      aria-label="Next"
      {...props}
    >
      {/* simple chevron right */}
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M9 6l6 6-6 6"/></svg>
    </Button>
  );
}

export default Carousel;
