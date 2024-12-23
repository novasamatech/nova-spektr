import { type PropsWithChildren, useContext, useMemo, useState } from 'react';

import { ThemeContext, type ThemeContextTheme } from './ThemeContext';

type Props = PropsWithChildren<
  Partial<Pick<ThemeContextTheme, 'iconStyle' | 'theme'>> & {
    bodyAsPortalContainer?: boolean;
  }
>;

export const ThemeProvider = ({ bodyAsPortalContainer, iconStyle, theme, children }: Props) => {
  const parentContext = useContext(ThemeContext);
  const [portal, setPortal] = useState<HTMLElement | null>(null);

  const value = useMemo<ThemeContextTheme>(() => {
    return {
      portalContainer: bodyAsPortalContainer
        ? parentContext.portalContainer
        : (portal ?? parentContext.portalContainer),
      iconStyle: iconStyle ?? parentContext.iconStyle,
      theme: theme ?? parentContext.theme,
    };
  }, [parentContext, portal, iconStyle, theme, bodyAsPortalContainer]);

  return (
    <ThemeContext.Provider value={value}>
      <div className="contents text-body text-text-primary">{children}</div>
      <div ref={setPortal} className="absolute z-100" />
    </ThemeContext.Provider>
  );
};
