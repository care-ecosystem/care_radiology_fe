import { ArrowBigUp, CornerDownLeft } from "lucide-react";
import { cn } from "@/lib/utils";

type KbdBadgeProps = {
  keys: "esc" | "p" | "e" | "shift+p" | "shift+enter" | "shift+e" | "shift+esc";
  variant?: "light" | "solid";
  className?: string;
};

export default function KbdBadge({ keys, variant = "light", className }: KbdBadgeProps) {
  const colorClasses =
    variant === "solid"
      ? "bg-white text-green-700"
      : "bg-gray-100 text-gray-500";

  const iconFill = variant === "solid" ? "fill-green-700" : "fill-gray-500";

  const content = (() => {
    switch (keys) {
      case "esc":
        return "Esc";
      case "p":
        return "P";
      case "e":
        return "E";
      case "shift+p":
        return (
          <>
            <ArrowBigUp size={12} className={iconFill} />
            P
          </>
        );
      case "shift+enter":
        return (
          <>
            <ArrowBigUp size={12} className={iconFill} />
            <CornerDownLeft size={12} />
          </>
        );
      case "shift+e":
        return (
          <>
            <ArrowBigUp size={12} className={iconFill} />
            E
          </>
        );
      case "shift+esc":
        return (
          <>
            <ArrowBigUp size={12} className={iconFill} />
            Esc
          </>
        );
      default:
        return null;
    }
  })();

  return (
    <span
      className={cn(
        "ml-2 flex items-center gap-0.5 h-5 px-1.5 rounded text-[10px] font-semibold",
        colorClasses,
        className
      )}
    >
      {content}
    </span>
  );
}