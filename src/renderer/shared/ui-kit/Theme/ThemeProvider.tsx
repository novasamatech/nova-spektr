import { type PropsWithChildren, useMemo, useState } from 'react';

import { ThemeContext, type ThemeContextTheme } from './ThemeContext';

type Props = PropsWithChildren<{
  bodyAsPortalContainer?: boolean;
}>;

export const ThemeProvider = ({ bodyAsPortalContainer, children }: Props) => {
  const [portal, setPortal] = useState<HTMLElement | null>(null);

  const value = useMemo<ThemeContextTheme>(() => {
    return {
      portalContainer: bodyAsPortalContainer ? null : portal,
    };
  }, [portal, bodyAsPortalContainer]);

  return (
    <ThemeContext.Provider value={value}>
      <div className="contents text-body text-text-primary">{children}</div>
      <div ref={setPortal} className="absolute z-100" />
    </ThemeContext.Provider>
  );
};
