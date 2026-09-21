import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, Loader2Icon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export interface ComboBoxOption {
  value: string;
  label: string;
  description?: string;
}

interface ComboBoxProps {
  options: ComboBoxOption[];
  value?: string | null;
  onSelect: (value: string) => void;
  placeholder: string;
  searchPlaceholder?: string;
  emptyMessage: string;
  loadingMessage?: string;
  search?: string;
  onSearchChange?: (search: string) => void;
  loading?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function ComboBox({
  options,
  value,
  onSelect,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  loadingMessage,
  search,
  onSearchChange,
  loading,
  disabled,
  id,
  className,
}: ComboBoxProps) {
  const [open, setOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = `${useId()}-listbox`;

  const isServerSearch = !!onSearchChange;
  const searchValue = isServerSearch ? (search ?? "") : localSearch;

  const visibleOptions = useMemo(() => {
    if (isServerSearch || !localSearch.trim()) return options;
    const needle = localSearch.trim().toLowerCase();
    return options.filter((option) =>
      option.label.toLowerCase().includes(needle),
    );
  }, [isServerSearch, localSearch, options]);

  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        id={id}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
        className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-gray-200 bg-white px-3 py-1 text-sm shadow-xs transition-colors focus-visible:border-primary-500 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span
          className={cn(
            "min-w-0 truncate text-left",
            !selected && "text-gray-500",
          )}
        >
          {selected?.label ?? placeholder}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-gray-500" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-md">
          <div className="border-b border-gray-100 p-1.5">
            <Input
              ref={inputRef}
              value={searchValue}
              placeholder={searchPlaceholder ?? placeholder}
              onChange={(event) =>
                isServerSearch
                  ? onSearchChange(event.target.value)
                  : setLocalSearch(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Escape") setOpen(false);
              }}
            />
          </div>
          <ul
            id={listboxId}
            role="listbox"
            className="max-h-60 overflow-y-auto p-1"
          >
            {loading && (
              <li className="flex items-center gap-2 px-2 py-3 text-sm text-gray-500">
                <Loader2Icon className="size-4 animate-spin" />
                {loadingMessage}
              </li>
            )}
            {!loading && visibleOptions.length === 0 && (
              <li className="px-2 py-3 text-sm text-gray-500">
                {emptyMessage}
              </li>
            )}
            {!loading &&
              visibleOptions.map((option) => (
                <li key={option.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={option.value === value}
                    onClick={() => {
                      onSelect(option.value);
                      setOpen(false);
                      if (!isServerSearch) setLocalSearch("");
                    }}
                    className={cn(
                      "flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors hover:bg-gray-100 focus:bg-gray-100 focus-visible:outline-hidden",
                      option.value === value &&
                        "bg-gray-50 font-medium text-gray-900",
                    )}
                  >
                    <Check
                      className={cn(
                        "mt-0.5 size-4 shrink-0",
                        option.value === value ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block break-words">{option.label}</span>
                      {option.description && (
                        <span className="block break-words text-xs text-gray-500">
                          {option.description}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
