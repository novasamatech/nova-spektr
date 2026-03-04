import { useUnit } from 'effector-react';
import { Outlet } from 'react-router-dom';

import { type Contact, isBackendContact, isLocalContact } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { Header } from '@/shared/ui';
import {
  type BackendError,
  BackendContactRow,
  BackendErrorView,
  BackendLoadingView,
  CachedWithErrorView,
  ContactRow,
  EmptyBackendView,
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
  | { view: 'error'; error: BackendError }
  | { view: 'cachedWithError'; error: BackendError; items: Contact[] }
  | { view: 'emptyLocal' }
  | { view: 'emptyBackend' }
  | { view: 'noResults' }
  | { view: 'contacts'; items: Contact[] };

function computeViewState(params: {
  isBackendTab: boolean;
  isLoading: boolean;
  backendError: BackendError | null;
  localContacts: Contact[];
  filteredContacts: Contact[];
}): ViewState {
  const { isBackendTab, isLoading, backendError, localContacts, filteredContacts } = params;

  if (isBackendTab && isLoading && filteredContacts.length === 0) return { view: 'loading' };
  if (isBackendTab && backendError && filteredContacts.length > 0) {
    return { view: 'cachedWithError', error: backendError, items: filteredContacts };
  }
  if (isBackendTab && backendError) return { view: 'error', error: backendError };
  if (isBackendTab && filteredContacts.length === 0) return { view: 'emptyBackend' };
  if (!isBackendTab && localContacts.length === 0) return { view: 'emptyLocal' };
  if (!isBackendTab && filteredContacts.length === 0) return { view: 'noResults' };

  return { view: 'contacts', items: filteredContacts };
}

function renderContactList(items: Contact[], onSendTo: (contact: Contact) => void) {
  return (
    <ul className="flex flex-col gap-y-2">
      {items.map((contact) =>
        isBackendContact(contact) ? (
          <BackendContactRow key={contact.id} contact={contact} onSendTo={onSendTo} />
        ) : isLocalContact(contact) ? (
          <ContactRow key={contact.id} contact={contact} onSendTo={onSendTo} />
        ) : null,
      )}
    </ul>
  );
}

function renderViewState(viewState: ViewState, onSendTo: (contact: Contact) => void, onRetry: () => void) {
  switch (viewState.view) {
    case 'loading':
      return <BackendLoadingView />;
    case 'error':
      return (
        <BackendErrorView category={viewState.error.category} message={viewState.error.message} onRetry={onRetry} />
      );
    case 'cachedWithError':
      return (
        <CachedWithErrorView
          category={viewState.error.category}
          items={viewState.items}
          onSendTo={onSendTo}
          onRetry={onRetry}
        />
      );
    case 'emptyBackend':
      return <EmptyBackendView />;
    case 'emptyLocal':
      return <EmptyContactList />;
    case 'noResults':
      return <EmptyFilteredContacts />;
    case 'contacts':
      return renderContactList(viewState.items, onSendTo);
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

  const showTabs = availableSources.length > 1;
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
            {hasBackend && <SyncStatusBadge />}
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
            {showTabs && <SourceTabs localCount={localContacts.length} backendCount={backendContacts.length} />}

            <div className="flex-1" aria-live="polite" aria-busy={viewState.view === 'loading'}>
              {renderViewState(viewState, handleSendTo, handleSync)}
            </div>
          </div>
        </section>
      </div>

      <Outlet />

      <SendToContactModal />
      <BackendConfigurationModal />
    </>
  );
};
