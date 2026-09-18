import { useEffect, useState } from "react";

/**
 * Tracks a CSS media query from JS.
 *
 * The host app strips `@import "tailwindcss"` out of plugin stylesheets, so a
 * plugin only gets the utility classes that care_fe itself happens to use.
 * Responsive variants (`md:w-72`, `sm:min-h-0`, ...) are frequently absent and
 * fail silently, so layouts that must change with viewport width switch on this
 * hook and apply unprefixed utilities instead.
 */
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(
    () => window.matchMedia(query).matches,
  );

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);
    const onChange = () => setMatches(mediaQueryList.matches);
    onChange();
    mediaQueryList.addEventListener("change", onChange);
    return () => mediaQueryList.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

export default useMediaQuery;
