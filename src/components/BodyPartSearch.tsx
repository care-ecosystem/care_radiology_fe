import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apis } from "@/apis";
import { debounced } from "@/utils/query";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Button } from "./ui/button";
import { ChevronDown } from "lucide-react";

interface ValueSetResult {
  code: string;
  display: string;
  system: string;
}

interface Props {
  value: string;
  onChange: (display: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function BodyPartSearch({
  value,
  onChange,
  placeholder = "Search body part...",
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data, isFetching } = useQuery<{ results: ValueSetResult[] }>({
    queryKey: ["valueset", "system-body-site", "expand", search],
    queryFn: debounced(() => apis.valueset.expand("system-body-site", search)),
    placeholderData: (prev) => prev,
    enabled: open,
  });

  const results = data?.results ?? [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className="w-full justify-between font-normal text-sm h-[38px] border-gray-300 bg-white"
        >
          <span className={value ? "text-gray-900" : "text-gray-400"}>
            {value || placeholder}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 w-[300px]"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command filter={() => 1}>
          <CommandInput
            placeholder={placeholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {isFetching ? (
              <div className="py-4 text-center text-sm text-gray-500">
                Searching...
              </div>
            ) : (
              <CommandEmpty>No results found.</CommandEmpty>
            )}
            <CommandGroup>
              {results.map((item: ValueSetResult) => (
                <CommandItem
                  key={item.code}
                  value={`${item.display} ${item.code}`}
                  onSelect={() => {
                    onChange(item.display);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  {item.display}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
