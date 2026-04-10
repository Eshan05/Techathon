import * as React from "react";

const DEFAULT_BREAKPOINT = 768;

export function useIsMobile(breakpoint: number = DEFAULT_BREAKPOINT) {
  const getMatches = React.useCallback(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(`(max-width: ${breakpoint - 1}px)`).matches;
  }, [breakpoint]);

  const [isMobile, setIsMobile] = React.useState<boolean>(getMatches);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);

    function onChange() {
      setIsMobile(mediaQuery.matches);
    }

    onChange();

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", onChange);
      return () => mediaQuery.removeEventListener("change", onChange);
    }

    // Safari < 14
    mediaQuery.addListener(onChange);
    return () => mediaQuery.removeListener(onChange);
  }, [breakpoint]);

  return isMobile;
}
