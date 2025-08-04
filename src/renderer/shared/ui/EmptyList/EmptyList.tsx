import { type PropsWithChildren, type ReactNode } from 'react';

import { Box, Graphics } from '@/shared/ui-kit';
import { Icon } from '../Icon/Icon';
import { BodyText, FootnoteText, SmallTitleText } from '../Typography';

type Props = {
  iconAlt?: string;
  title?: ReactNode;
  message: ReactNode;
};

export const EmptyList = ({ title, message, iconAlt = '', children }: PropsWithChildren<Props>) => {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <Graphics name="emptyList" alt={iconAlt} size={178} />

      <div className="flex flex-col items-center gap-3">
        <SmallTitleText>{title}</SmallTitleText>
        <BodyText className="w-[300px] text-center text-text-tertiary">{message}</BodyText>
      </div>

      {children}
    </div>
  );
};

export const EmptyListWithIcon = ({ title, message, children }: PropsWithChildren<Props>) => {
  return (
    <Box padding={[43, 10]} gap={2} horizontalAlign="center" verticalAlign="center">
      <Icon size={64} name="empty" className="mb-4" />
      <SmallTitleText>{title}</SmallTitleText>
      <FootnoteText className="text-center text-text-tertiary">{message} </FootnoteText>
      {children}
    </Box>
  );
};
