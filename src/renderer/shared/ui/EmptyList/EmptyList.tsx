import { type PropsWithChildren, type ReactNode } from 'react';

import { BodyText, Icon } from '@/shared/ui';

type Props = {
  iconAlt?: string;
  message: ReactNode;
};

export const EmptyList = ({ message, iconAlt = '', children }: PropsWithChildren<Props>) => {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <Icon as="img" name="emptyList" alt={iconAlt} size={178} />
      <BodyText className="w-[300px] text-center text-text-tertiary">{message}</BodyText>

      {children}
    </div>
  );
};
