import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { FootnoteText, Icon, Switch } from '@/shared/ui';
import { AddressBookHealthOverlay } from '@/features/contacts';
import { canStartDraft, useDraftAvailability } from '../lib/useDraftAvailability';

type Props = {
  isOn: boolean;
  onToggle: (next: boolean) => void;
};

/**
 * In-flow toggle card that flips a transaction-builder form into draft-creation
 * mode. Self-gating on `useDraftAvailability`: absent when no address book was
 * ever connected and when the user may not write drafts, since no action here
 * fixes either. When it was connected and is merely unreachable, the card stays
 * and a reconnect overlay covers it — that one the user can fix.
 *
 * The gate is the shared rule rather than a local restatement of it, because
 * anything that decides whether to _offer_ a draft has to reach the same
 * verdict as this card; a caller that opens a flow this card then hides leaves
 * the user in a form with no way out.
 *
 * The host owns `isOn` state. The visual "active" state collapses when the
 * address book is unhealthy — the user can't pick a source until they
 * reconnect, so the card stays compact under the overlay.
 */
export const DraftModeCard = ({ isOn, onToggle }: Props) => {
  const { t } = useI18n();
  const availability = useDraftAvailability();

  if (!canStartDraft(availability)) return null;

  const isHealthy = availability === 'ready';
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
