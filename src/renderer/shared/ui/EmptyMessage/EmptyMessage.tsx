import { type ReactNode } from 'react';

import { Box } from '@/shared/ui-kit';
import { Icon } from '../Icon/Icon';
import { FootnoteText, SmallTitleText } from '../Typography';

type Props = {
  title: string;
  description: ReactNode;
};

export const EmptyMessage = ({ title, description }: Props) => {
  return (
    <Box verticalAlign="center" horizontalAlign="center" grow={1} gap={6} width="100%" height="100%" padding={[32, 0]}>
      <Icon name="document" size={64} />
      <Box gap={2} horizontalAlign="center" width="340px">
        <SmallTitleText className="text-center">{title}</SmallTitleText>
        <FootnoteText className="text-center text-text-tertiary">{description}</FootnoteText>
      </Box>
    </Box>
  );
};
