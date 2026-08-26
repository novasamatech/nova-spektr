import { type PropsWithChildren } from 'react';

import { Icon } from '@/shared/ui';
import { Box } from '../Box/Box';

type Props = PropsWithChildren<{
  /**
   * Colours the warning icon: `warning` for recoverable states, `negative` for
   * hard failures.
   */
  tone: 'warning' | 'negative';
}>;

const ICON_TONE_CLASS: Record<Props['tone'], string> = {
  warning: 'text-icon-warning',
  negative: 'text-icon-negative',
};

/**
 * Centred 440px status panel: a large warning icon on top, caller-provided
 * title/description/actions below. The shared body for "operation blocked" and
 * draft submission verdict screens shown in place of a modal's content.
 */
export const StatusPanel = ({ tone, children }: Props) => {
  return (
    <Box width="440px" verticalAlign="center" horizontalAlign="center" gap={4} padding={[10, 5]}>
      <Icon className={ICON_TONE_CLASS[tone]} name="warnCutout" size={60} />
      {children}
    </Box>
  );
};
