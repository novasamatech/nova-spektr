import { type PropsWithChildren, useContext, useMemo, useState } from 'react';

import { ThemeContext, type ThemeContextTheme } from './ThemeContext';

type Props = PropsWithChildren<
  Partial<Pick<ThemeContextTheme, 'iconStyle' | 'theme' | 'preferStaticContent'>> & {
    bodyAsPortalContainer?: boolean;
  }
>;

export const ThemeProvider = ({ bodyAsPortalContainer, preferStaticContent, iconStyle, theme, children }: Props) => {
  const parentContext = useContext(ThemeContext);
  const [portal, setPortal] = useState<HTMLElement | null>(null);

  const value = useMemo<ThemeContextTheme>(() => {
    return {
      preferStaticContent: parentContext.preferStaticContent || preferStaticContent || false,
      portalContainer: bodyAsPortalContainer
        ? parentContext.portalContainer
        : (parentContext.portalContainer ?? portal),
      iconStyle: iconStyle ?? parentContext.iconStyle,
      theme: theme ?? parentContext.theme,
    };
  }, [parentContext, preferStaticContent, portal, iconStyle, theme, bodyAsPortalContainer]);

  return (
    <ThemeContext.Provider value={value}>
      <div className="contents text-body text-text-primary">{children}</div>
      <div ref={setPortal} className="pointer-events-none absolute inset-0 z-100 text-body text-text-primary" />
    </ThemeContext.Provider>
  );
};
