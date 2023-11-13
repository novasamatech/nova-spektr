import { PropsWithChildren } from 'react';

import { FootnoteText } from '@shared/ui';
import { useI18n } from '@app/providers';

export const ContactList = ({ children }: PropsWithChildren) => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-y-2">
      <div className="grid grid-cols-[250px,250px,1fr] items-center px-3">
        <FootnoteText className="text-text-secondary">{t('addressBook.contactList.nameColumnTitle')}</FootnoteText>
        <FootnoteText className="text-text-secondary">{t('addressBook.contactList.matrixIdColumnTitle')}</FootnoteText>
      </div>

      <ul className="flex flex-col gap-y-2">{children}</ul>
    </div>
  );
};
