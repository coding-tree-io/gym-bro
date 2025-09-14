import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

// Minimal Calendar component API compatible with shadcn's basic usage
// This implementation uses a native input[type="date"] under the hood
// to avoid adding heavy dependencies, while keeping the API surface small.
export type CalendarProps = React.HTMLAttributes<HTMLDivElement> & {
  mode?: "single"; // currently only single selection is supported
  selected?: Date;
  onSelect?: (date?: Date) => void;
  disabled?: (date: Date) => boolean;
};

export const Calendar = React.forwardRef<HTMLDivElement, CalendarProps>(
  ({ className, mode = "single", selected, onSelect, disabled, ...props }, ref) => {
    const [value, setValue] = React.useState<string>(() =>
      selected ? toInputDate(selected) : toInputDate(new Date())
    );

    React.useEffect(() => {
      if (selected) {
        const iso = toInputDate(selected);
        if (iso !== value) setValue(iso);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selected?.getTime?.()]);

    const handleChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
      const v = e.target.value;
      setValue(v);
      const d = fromInputDate(v);
      if (d && !isDisabled(d, disabled)) {
        onSelect?.(d);
      }
    };

    const min = undefined; // could be extended via props later
    const max = undefined;

    return (
      <div ref={ref} className={cn("inline-block", className)} {...props}>
        <Input
          type="date"
          value={value}
          onChange={handleChange}
          min={min as any}
          max={max as any}
          className={cn(
            "text-sm",
          )}
        />
      </div>
    );
  }
);
Calendar.displayName = "Calendar";

function toInputDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromInputDate(v: string): Date | undefined {
  if (!/\d{4}-\d{2}-\d{2}/.test(v)) return undefined;
  const [y, m, d] = v.split("-").map((n) => parseInt(n, 10));
  const date = new Date(y, m - 1, d);
  return isNaN(date.getTime()) ? undefined : date;
}

function isDisabled(date: Date, disabled?: (date: Date) => boolean) {
  try {
    return disabled ? disabled(date) : false;
  } catch {
    return false;
  }
}

export default Calendar;
