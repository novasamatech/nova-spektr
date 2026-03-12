import { type Contact, isBackendContact, isLocalContact } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { Alert, BodyText, Button } from '@/shared/ui';

import { BackendContactRow } from './BackendContactRow';
import { type BackendErrorCategory, i18nKeyByCategory } from './BackendErrorView';
import { ContactRow } from './ContactRow';

type Props = {
  category: BackendErrorCategory;
  items: Contact[];
  onSendTo: (contact: Contact) => void;
  onRetry: () => void;
};

export const CachedWithErrorView = ({ category, items, onSendTo, onRetry }: Props) => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-y-2">
      <Alert title={t('addressBook.sources.syncErrorCached')} active variant="warn">
        <Alert.Item withDot={false}>
          <div className="flex items-center gap-x-2">
            <BodyText className="break-all text-text-tertiary">{t(i18nKeyByCategory[category])}</BodyText>
            <Button variant="text" className="h-4.5 shrink-0" onClick={onRetry}>
              {t('addressBook.sources.retry')}
            </Button>
          </div>
        </Alert.Item>
      </Alert>
      <ul className="flex flex-col gap-y-2">
        {items.map((contact) =>
          isBackendContact(contact) ? (
            <BackendContactRow key={contact.id} contact={contact} onSendTo={onSendTo} />
          ) : isLocalContact(contact) ? (
            <ContactRow key={contact.id} contact={contact} onSendTo={onSendTo} />
          ) : null,
        )}
      </ul>
    </div>
  );
};
