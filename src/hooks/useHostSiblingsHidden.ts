import { RefObject, useEffect } from "react";

export function useHostSiblingsHidden(
  anchorRef: RefObject<HTMLElement | null>,
  active: boolean,
) {
  useEffect(() => {
    const anchor = anchorRef.current;
    const parent = anchor?.parentElement;
    if (!anchor || !parent || !active) return;

    const previousDisplay = new Map<HTMLElement, string>();

    const hideSiblings = () => {
      let sibling = anchor.nextElementSibling;
      while (sibling) {
        if (sibling instanceof HTMLElement && !previousDisplay.has(sibling)) {
          previousDisplay.set(sibling, sibling.style.display);
          sibling.style.display = "none";
        }
        sibling = sibling.nextElementSibling;
      }
    };

    hideSiblings();

    const observer = new MutationObserver(hideSiblings);
    observer.observe(parent, { childList: true });

    return () => {
      observer.disconnect();
      previousDisplay.forEach((display, element) => {
        element.style.display = display;
      });
    };
  }, [anchorRef, active]);
}
