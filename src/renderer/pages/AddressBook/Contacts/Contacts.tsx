import { useUnit } from 'effector-react';
import { Outlet } from 'react-router-dom';

import { type Contact, isBackendContact, isLocalContact } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { BodyText, Button, Header, Icon } from '@/shared/ui';
import {
  BackendContactRow,
  ContactRow,
  EmptyContactList,
  EmptyFilteredContacts,
  contactModel,
} from '@/entities/contact';
import {
  BackendConfigurationButton,
  BackendConfigurationModal,
  BackendConnectionCard,
  ContactFilter,
  CreateContactNavigation,
  ImportContactsButton,
  SourceTabs,
  SyncStatusBadge,
  backendConfigurationModel,
  backendContactsModel,
  contactSourceModel,
  filterModel,
} from '@/features/contacts';
import { SendToContactModal, sendToContactModel } from '@/features/send-to-contact';

type ViewState =
  | { view: 'loading' }
  | { view: 'error'; message: string }
  | { view: 'emptyLocal' }
  | { view: 'emptyBackend' }
  | { view: 'noResults' }
  | { view: 'contacts'; items: Contact[] };

function computeViewState(params: {
  isBackendTab: boolean;
  isLoading: boolean;
  backendError: string | null;
  localContacts: Contact[];
  filteredContacts: Contact[];
}): ViewState {
  const { isBackendTab, isLoading, backendError, localContacts, filteredContacts } = params;

  if (isBackendTab && isLoading) return { view: 'loading' };
  if (isBackendTab && backendError) return { view: 'error', message: backendError };
  if (isBackendTab && filteredContacts.length === 0) return { view: 'emptyBackend' };
  if (!isBackendTab && localContacts.length === 0) return { view: 'emptyLocal' };
  if (!isBackendTab && filteredContacts.length === 0) return { view: 'noResults' };

  return { view: 'contacts', items: filteredContacts };
}

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

const LoadingView = () => (
  <ul className="flex flex-col gap-y-2">
    {Array.from({ length: 5 }).map((_, i) => (
      <li key={i}>
        <ContactSkeleton />
      </li>
    ))}
  </ul>
);

const ErrorView = ({ error, onRetry }: { error: string; onRetry: () => void }) => {
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

const EmptyBackendView = () => {
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

function renderViewState(viewState: ViewState, onSendTo: (contact: Contact) => void, onRetry: () => void) {
  switch (viewState.view) {
    case 'loading':
      return <LoadingView />;
    case 'error':
      return <ErrorView error={viewState.message} onRetry={onRetry} />;
    case 'emptyBackend':
      return <EmptyBackendView />;
    case 'emptyLocal':
      return <EmptyContactList />;
    case 'noResults':
      return <EmptyFilteredContacts />;
    case 'contacts':
      return (
        <ul className="flex flex-col gap-y-2">
          {viewState.items.map((contact) =>
            isBackendContact(contact) ? (
              <BackendContactRow key={contact.id} contact={contact} onSendTo={onSendTo} />
            ) : isLocalContact(contact) ? (
              <ContactRow key={contact.id} contact={contact} onSendTo={onSendTo} />
            ) : null,
          )}
        </ul>
      );
  }
}

export const Contacts = () => {
  const { t } = useI18n();

  const [
    localContacts,
    backendContacts,
    filteredContacts,
    availableSources,
    sourceTab,
    hasBackend,
    isLoading,
    backendError,
  ] = useUnit([
    contactModel.$localContacts,
    contactModel.$backendContacts,
    filterModel.$filteredContacts,
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

  const viewState = computeViewState({
    isBackendTab,
    isLoading,
    backendError,
    localContacts,
    filteredContacts,
  });

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
          <div className="mx-auto flex h-full w-[636px] flex-col gap-y-4 pb-4">
            {showTabs && (
              <div className="flex items-center gap-x-2">
                <SourceTabs localCount={localContacts.length} backendCount={backendContacts.length} />
                {isBackendTab && <SyncStatusBadge />}
              </div>
            )}

            {renderViewState(viewState, handleSendTo, handleSync)}
          </div>
        </section>
      </div>

      <Outlet />

      <SendToContactModal />
      <BackendConfigurationModal />
    </>
  );
};
