import { type PropsWithChildren } from 'react';

import { useI18n } from '@app/providers';
import { FootnoteText } from '@shared/ui';

export const ContactList = ({ children }: PropsWithChildren) => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-y-2">
      <div className="grid grid-cols-[250px,250px,1fr] items-center px-3">
        <FootnoteText className="text-text-secondary">{t('addressBook.contactList.nameColumnTitle')}</FootnoteText>
      </div>

      <ul className="flex flex-col gap-y-2">{children}</ul>
    </div>
  );
};
