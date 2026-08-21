import { useI18n } from '@/shared/i18n';
import { Modal } from '@/shared/ui-kit';
import { type AccountsTableState } from '../hooks/useAccountsTable';

import { AccountsTableView } from './AccountsTableView';

type Props = {
  table: AccountsTableState;
  isOpen: boolean;
  onToggle: (open: boolean) => void;
};

/**
 * The same table, given the whole window — `size="3xl" height="full"`, the
 * configuration the staking validator picker uses, so the two full-screen
 * tables in the app read as one thing.
 *
 * It shares the widget's `useAccountsTable` instance rather than owning one:
 * whatever is filtered, sorted, searched or folded in the widget is what opens
 * here, and any change made here is still there after closing. Escape, the
 * cross and an outside click all close it (Radix defaults) — there is nothing
 * to lose by closing, so nothing guards it.
 */
export const AccountsTableFullScreen = ({ table, isOpen, onToggle }: Props) => {
  const { t } = useI18n();

  return (
    <Modal isOpen={isOpen} size="3xl" height="full" onToggle={onToggle}>
      <Modal.Title close>{t('dashboard.accountsTable.fullViewTitle')}</Modal.Title>

      {/* The view owns its own scroll region (rows only, header and filters
          stay put), so the modal must not wrap it in a second scroller. */}
      <Modal.Content disableScroll>
        <AccountsTableView table={table} />
      </Modal.Content>
    </Modal>
  );
};
