import { useNavigate } from 'react-router-dom';

import { type Address } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { Paths } from '@/shared/routes';
import { Alert, Button, FootnoteText, SmallTitleText } from '@/shared/ui';
import { Graphics } from '@/shared/ui-kit';
import { type DraftAvailability } from '../lib/useDraftAvailability';

type Props = {
  /**
   * Never `offline` — that state renders nothing, the mode card carries the
   * reconnect.
   */
  availability: Exclude<DraftAvailability, 'offline'>;
  /** The address the flow was opened for, when the source is pinned. */
  pinnedAddress: Address | null;
  chainName: string;
  /**
   * Closes the host flow before the address book opens. Flows mounted in the
   * global modals slot survive navigation, so without it the modal would stay
   * on top of the page it just sent the user to — which is why the "Open
   * address book" button is only offered when the host provides this.
   */
  onLeaveFlow?: () => void;
};

/**
 * What stands in for the source picker when it would be empty.
 *
 * Three reasons, three different next moves: no permission and no connection
 * are told as they are — nothing on this screen fixes them — while an address
 * book that simply lacks a usable source gets a way to go and add one. That way
 * is offered only to hosts that can close themselves first: a modal that
 * outlives navigation would otherwise sit on top of the address book it
 * opened.
 */
export const DraftSourcesEmpty = ({ availability, pinnedAddress, chainName, onLeaveFlow }: Props) => {
  const { t } = useI18n();

  if (availability === 'noPermission') {
    return (
      <Alert active variant="warn" title={t('operations.drafts.noPermissionTitle')}>
        <FootnoteText className="text-text-secondary">
          {pinnedAddress
            ? t('operations.drafts.noPermissionForAccount', { address: pinnedAddress })
            : t('operations.drafts.noPermissionForDrafts')}
        </FootnoteText>
      </Alert>
    );
  }

  if (availability === 'notConnected') {
    return (
      <Alert active variant="warn" title={t('operations.drafts.notConnectedForDrafts')}>
        <FootnoteText className="text-text-secondary">{t('operations.drafts.connectToCreate')}</FootnoteText>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-shade-12 px-6 py-6 text-center">
      <Graphics name="emptyList" size={64} />
      <div className="flex flex-col items-center gap-2">
        <SmallTitleText>{t('operations.drafts.noSourcesTitle')}</SmallTitleText>
        <FootnoteText className="break-words text-text-tertiary">
          {pinnedAddress
            ? t('operations.drafts.noSourcesPinnedHint', { address: pinnedAddress })
            : t('operations.drafts.noSourcesHint', { chain: chainName })}
        </FootnoteText>
      </div>
      {onLeaveFlow && <OpenAddressBookButton onLeaveFlow={onLeaveFlow} />}
    </div>
  );
};

/**
 * Its own component so the router hook is only reached on the branch that
 * navigates: the notices above render in hosts that are tested outside a
 * router, and would otherwise throw for a button they never show.
 */
const OpenAddressBookButton = ({ onLeaveFlow }: { onLeaveFlow: () => void }) => {
  const { t } = useI18n();
  const navigate = useNavigate();

  const openAddressBook = () => {
    onLeaveFlow();
    navigate(Paths.ADDRESS_BOOK);
  };

  return (
    <Button pallet="secondary" onClick={openAddressBook}>
      {t('operations.drafts.openAddressBookButton')}
    </Button>
  );
};
