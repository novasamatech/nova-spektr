import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { FootnoteText, Icon, Switch } from '@/shared/ui';
import { connectionHistoryModel } from '@/aggregates/backend';
import { backendContactsModel } from '@/features/contacts';
import { useCanCreateDraft } from '../lib/useCanCreateDraft';

import { AddressBookHealthOverlay } from './AddressBookHealthOverlay';

type Props = {
  isOn: boolean;
  onToggle: (next: boolean) => void;
};

/**
 * In-flow toggle card that flips a transaction-builder form into draft-creation
 * mode. Self-gating: returns null when the user has never connected to the
 * backend or lacks write permission. When the address book is offline, the card
 * stays visible but is covered by a reconnect overlay.
 *
 * The host owns `isOn` state. The visual "active" state collapses when the
 * address book is unhealthy — the user can't pick a source until they
 * reconnect, so the card stays compact under the overlay.
 */
export const DraftModeCard = ({ isOn, onToggle }: Props) => {
  const { t } = useI18n();
  const hasEverConnected = useUnit(connectionHistoryModel.$hasEverConnected);
  const isHealthy = useUnit(backendContactsModel.$isHealthy);
  const canWrite = useCanCreateDraft();

  if (!hasEverConnected) return null;
  // No reconnect can fix a missing permission — hide the card entirely.
  if (isHealthy && !canWrite) return null;

  const isVisuallyActive = isOn && isHealthy;

  return (
    <AddressBookHealthOverlay isHealthy={isHealthy}>
      <div
        className={cnTw(
          'rounded-lg border border-container-border transition-colors duration-200',
          isVisuallyActive && 'bg-alert-background',
        )}
      >
        <Switch checked={isVisuallyActive} variant="accent" className="px-3.5 py-2.5" onChange={onToggle}>
          <div className="flex items-center gap-x-1.5">
            <Icon name="info" size={16} className="shrink-0 text-icon-accent" />
            <FootnoteText className="text-text-primary">{t('operations.drafts.modeCardLabel')}</FootnoteText>
          </div>
        </Switch>
        <div
          aria-hidden={!isVisuallyActive}
          className={cnTw(
            'overflow-hidden transition-[max-height] duration-300 ease-out',
            isVisuallyActive ? 'max-h-[240px]' : 'max-h-0',
          )}
        >
          <div className="border-t border-container-border px-3.5 py-2.5">
            <FootnoteText className="text-text-secondary">{t('operations.drafts.modeCardDescription')}</FootnoteText>
          </div>
        </div>
      </div>
    </AddressBookHealthOverlay>
  );
};
