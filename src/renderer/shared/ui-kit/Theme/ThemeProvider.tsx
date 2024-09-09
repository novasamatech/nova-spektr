import { type PropsWithChildren, useMemo, useState } from 'react';

import { ThemeContext, type ThemeContextTheme } from './ThemeContext';

export const ThemeProvider = ({ children }: PropsWithChildren) => {
  const [portal, setPortal] = useState<HTMLElement | null>(null);

  const value = useMemo<ThemeContextTheme>(() => {
    return {
      portalContainer: portal,
    };
  }, [portal]);

  return (
    <ThemeContext.Provider value={value}>
      <div className="contents text-body text-text-primary">{children}</div>
      <div ref={setPortal} className="absolute z-100" />
    </ThemeContext.Provider>
  );
};
