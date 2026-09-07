import * as React from "react";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

interface DatePickerProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

function tryParseDate(value: string): Date | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const date = new Date(trimmed + "T00:00:00");
    if (!isNaN(date.getTime())) return date;
  }

  const normalized = trimmed.replace(/[-./]/g, "/");

  const date = parse(normalized, "d/M/yyyy", new Date());
  if (!isNaN(date.getTime())) return date;

  return undefined;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "dd/mm/aaaa",
  disabled,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  React.useEffect(() => {
    if (value) {
      const date = tryParseDate(value);
      if (date) {
        setInputValue(format(date, "dd/MM/yyyy"));
      } else {
        setInputValue("");
      }
    } else {
      setInputValue("");
    }
  }, [value]);

  const handleSelect = (date: Date | undefined) => {
    if (!date) return;
    const iso = format(date, "yyyy-MM-dd");
    setInputValue(format(date, "dd/MM/yyyy"));
    onChange?.(iso);
    setOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputBlur = () => {
    const parsed = tryParseDate(inputValue);
    if (parsed) {
      const iso = format(parsed, "yyyy-MM-dd");
      const formatted = format(parsed, "dd/MM/yyyy");
      setInputValue(formatted);
      onChange?.(iso);
    } else if (inputValue.trim() === "") {
      setInputValue("");
      onChange?.("");
    } else if (value) {
      const date = tryParseDate(value);
      if (date) {
        setInputValue(format(date, "dd/MM/yyyy"));
      }
    }
  };

  return (
    <div className="relative flex items-center">
      <Input
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={cn("pr-10", className)}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            disabled={disabled}
            className="absolute right-0 top-0 h-full w-10 rounded-l-none"
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value ? tryParseDate(value) : undefined}
            onSelect={handleSelect}
            locale={ptBR}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
