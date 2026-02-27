import { useUnit } from 'effector-react';
import { Outlet } from 'react-router-dom';

import { type Contact, isBackendContact, isLocalContact } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { Header, IconButton } from '@/shared/ui';
import {
  BackendContactRow,
  BackendErrorView,
  BackendLoadingView,
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

function renderViewState(viewState: ViewState, onSendTo: (contact: Contact) => void, onRetry: () => void) {
  switch (viewState.view) {
    case 'loading':
      return <BackendLoadingView />;
    case 'error':
      return <BackendErrorView error={viewState.message} onRetry={onRetry} />;
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
