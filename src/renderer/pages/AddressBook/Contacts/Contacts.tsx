import { useUnit } from 'effector-react';
import { Outlet } from 'react-router-dom';

import { type Contact } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { BodyText, Button, Header, Icon, IconButton } from '@/shared/ui';
import {
  BackendContactRow,
  ContactRow,
  EmptyContactList,
  EmptyFilteredContacts,
  contactModel,
} from '@/entities/contact';
import {
  AuthModal,
  BackendConfigurationButton,
  BackendConfigurationModal,
  BackendConnectionCard,
  ContactFilter,
  CreateContactNavigation,
  ImportContactsButton,
  SourceTabs,
  backendConfigurationModel,
  backendContactsModel,
  contactSourceModel,
  filterModel,
} from '@/features/contacts';
import { SendToContactModal, sendToContactModel } from '@/features/send-to-contact';

const ContactSkeleton = () => (
  <div className="flex animate-pulse flex-col gap-y-2.5 rounded-md bg-white p-3">
    <div className="flex items-center gap-x-2">
      <div className="h-5 w-5 rounded-full bg-shade-12" />
      <div className="flex flex-col gap-y-1">
        <div className="h-3.5 w-24 rounded bg-shade-12" />
        <div className="h-3 w-40 rounded bg-shade-8" />
      </div>
    </div>
    <div className="flex gap-x-1">
      <div className="h-5 w-14 rounded-2xl bg-shade-8" />
      <div className="h-5 w-20 rounded-2xl bg-shade-8" />
      <div className="h-5 w-16 rounded-2xl bg-shade-8" />
    </div>
  </div>
);

const LoadingState = () => (
  <ul className="flex flex-col gap-y-2">
    {}
    {Array.from({ length: 5 }).map((_, i) => (
      <li key={i}>
        <ContactSkeleton />
      </li>
    ))}
  </ul>
);

const ErrorState = ({ error, onRetry }: { error: string; onRetry: () => void }) => {
  const { t } = useI18n();

  return (
    <div className="flex h-full flex-col items-center justify-center gap-y-3 py-12">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-badge-red-background-default">
        <Icon name="warnCutout" size={20} className="text-text-negative" />
      </div>
      <BodyText className="text-text-tertiary">{t('addressBook.sources.loadError')}</BodyText>
      <BodyText className="max-w-full text-center text-caption break-all text-text-tertiary">{error}</BodyText>
      <Button variant="text" className="h-4.5" onClick={onRetry}>
        {t('addressBook.sources.retry')}
      </Button>
    </div>
  );
};

const EmptyBackendState = () => {
  const { t } = useI18n();

  return (
    <div className="flex h-full flex-col items-center justify-center gap-y-3 py-12">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-input-background-disabled">
        <Icon name="globe" size={20} className="text-text-tertiary" />
      </div>
      <BodyText className="text-text-tertiary">{t('addressBook.sources.emptyBackend')}</BodyText>
    </div>
  );
};

export const Contacts = () => {
  const { t } = useI18n();

  const [
    localContacts,
    backendContacts,
    sourcedContactsFiltered,
    availableSources,
    sourceTab,
    hasBackend,
    isLoading,
    backendError,
  ] = useUnit([
    contactModel.$localContacts,
    contactModel.$backendContacts,
    filterModel.$sourcedContactsFiltered,
    contactSourceModel.$availableSources,
    contactSourceModel.$sourceTab,
    backendConfigurationModel.$hasBackend,
    backendContactsModel.$isLoading,
    backendContactsModel.$error,
  ]);

  const handleSendTo = (contact: Contact) => {
    sendToContactModel.events.sendToContactStarted(contact);
  };

  const handleSync = () => {
    backendContactsModel.events.syncTriggered();
  };

  const showTabs = availableSources.length > 0;
  const isBackendTab = sourceTab !== 'local';
  const hasContacts = isBackendTab ? sourcedContactsFiltered.length > 0 : localContacts.length > 0;
  const hasFilteredContacts = sourcedContactsFiltered.length > 0;

  return (
    <>
      <div className="flex h-full flex-col">
        <Header title={t('addressBook.title')} titleClass="py-[3px]" headerClass="pt-4 pb-[15px]">
          <div className="flex items-center gap-x-4">
            {hasBackend ? <BackendConnectionCard /> : <BackendConfigurationButton />}
            <div className="w-[230px]">
              <ContactFilter />
            </div>
            <div className="ml-auto flex items-center justify-end gap-x-4">
              <CreateContactNavigation />
              <ImportContactsButton />
            </div>
          </div>
        </Header>

        <section className="mt-4 h-full w-full overflow-y-auto">
          <div className="mx-auto flex h-full w-[636px] flex-col gap-y-4">
            {showTabs && (
              <div className="flex items-center gap-x-2">
                <SourceTabs localCount={localContacts.length} backendCount={backendContacts.length} />
                {isBackendTab && (
                  <IconButton
                    className={cnTw('shrink-0 text-icon-default', isLoading && 'animate-spin')}
                    disabled={isLoading}
                    name="refresh"
                    onClick={handleSync}
                  />
                )}
              </div>
            )}

            {isBackendTab && isLoading && <LoadingState />}

            {isBackendTab && !isLoading && backendError && <ErrorState error={backendError} onRetry={handleSync} />}

            {isBackendTab && !isLoading && !backendError && !hasFilteredContacts && <EmptyBackendState />}

            {!isBackendTab && !hasContacts && <EmptyContactList />}

            {!isBackendTab && hasContacts && !hasFilteredContacts && <EmptyFilteredContacts />}

            {hasFilteredContacts && !isBackendTab && (
              <ul className="flex flex-col gap-y-2">
                {sourcedContactsFiltered.map((sourced) => (
                  <ContactRow key={sourced.contact.id} contact={sourced.contact} onSendTo={handleSendTo} />
                ))}
              </ul>
            )}

            {hasFilteredContacts && isBackendTab && (
              <ul className="flex flex-col gap-y-2">
                {sourcedContactsFiltered.map((sourced) => (
                  <BackendContactRow key={sourced.contact.id} contact={sourced.contact} onSendTo={handleSendTo} />
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      <Outlet />

      <SendToContactModal />
      <BackendConfigurationModal />
      <AuthModal />
    </>
  );
};
