import { useUnit } from 'effector-react';
import { useState } from 'react';
import { Trans } from 'react-i18next';

import { useI18n } from '@/shared/i18n';
import { cnTw, nonNullable } from '@/shared/lib/utils';
import { BodyText, Button, FootnoteText, Icon, IconButton } from '@/shared/ui';
import { AssetBalance } from '@/shared/ui-entities';
import { Box, Checkbox, Modal, Tooltip } from '@/shared/ui-kit';
import { type AnyAccount } from '@/domains/network';
import { allTracks, locksService } from '@/entities/governance';
import { editDelegationModel } from '@/widgets/EditDelegationModal';
import { NamedAccount } from '@/widgets/NameResolver';
import { revokeDelegationModel } from '@/widgets/RevokeDelegationModal';
import { delegateDetailsModel } from '../model/delegate-details-model';

const GRID_TEMPLATE = 'grid-cols-[40px_412px_166px_62px_44px_44px]';

export const YourDelegations = () => {
  const { t } = useI18n();

  const isOpen = useUnit(delegateDetailsModel.$isDelegationsOpen);
  const chain = useUnit(delegateDetailsModel.$chain);
  const activeAccounts = useUnit(delegateDetailsModel.$activeAccounts);
  const activeDelegations = useUnit(delegateDetailsModel.$activeDelegations);
  const activeTracks = useUnit(delegateDetailsModel.$activeTracks);
  const delegate = useUnit(delegateDetailsModel.$delegate);
  const initiators = useUnit(delegateDetailsModel.$initiators);

  const [selectedAccounts, setSelectedAccounts] = useState<AnyAccount[]>([]);

  if (!chain) return null;

  const accounts =
    initiators.filter((account) => {
      return activeAccounts.includes(account.accountId);
    }) || [];

  const toggleAccount = (account: AnyAccount) => {
    if (selectedAccounts.includes(account)) {
      setSelectedAccounts(selectedAccounts.filter((x) => x !== account));
    } else {
      setSelectedAccounts([...selectedAccounts, account]);
    }
  };

  const toggleAllAccounts = () => {
    if (selectedAccounts.length === activeAccounts.length) {
      setSelectedAccounts([]);
    } else {
      const selectableAccounts = activeAccounts.map((accountId) => accounts.find((a) => a.accountId === accountId));

      setSelectedAccounts(selectableAccounts.filter(nonNullable));
    }
  };

  return (
    <Modal
      size="lg"
      height="lg"
      isOpen={isOpen}
      onToggle={(state) => {
        if (!state) delegateDetailsModel.events.closeDelegationsModal();
      }}
    >
      <Modal.Title close>{t('governance.delegationDetails.yourDelegationsTitle')}</Modal.Title>
      <Modal.Content>
        <div className={cnTw('mx-2 mt-4 mb-2 grid grid-flow-row items-center', GRID_TEMPLATE)}>
          <Box direction="row" horizontalAlign="center" verticalAlign="center">
            <Checkbox
              checked={selectedAccounts.length === activeAccounts.length}
              semiChecked={selectedAccounts.length > 0}
              onChange={toggleAllAccounts}
            />
          </Box>
          <FootnoteText className="px-3 text-text-tertiary">
            {t('governance.addDelegation.accountsLabel', { count: 1 })}
          </FootnoteText>
          <FootnoteText className="justify-self-end px-3 text-text-tertiary">
            {t('governance.addDelegation.lockedAmount')}
          </FootnoteText>
          <FootnoteText className="px-3 text-text-tertiary">{t('governance.addDelegation.tracksLabel')}</FootnoteText>
        </div>

        <ul className="mx-2 mb-4 flex flex-col gap-y-2">
          {activeAccounts.map((accountId, index) => {
            const activeDelegation = activeDelegations[accountId];

            const account = accounts.find((a) => {
              return a.accountId === accountId;
            });

            if (!account || !activeDelegation || !activeTracks[account.accountId]) return null;

            return (
              <li key={accountId} className={cnTw('grid h-13 grid-flow-row items-center', GRID_TEMPLATE)}>
                <Box horizontalAlign="center">
                  <Checkbox checked={selectedAccounts.includes(account)} onChange={() => toggleAccount(account)} />
                </Box>

                <Box padding={[0, 3]}>
                  <NamedAccount iconSize={20} accountId={account.accountId} chain={chain} variant="truncate" />
                </Box>

                <Box padding={[0, 3]} horizontalAlign="end">
                  <BodyText>
                    <Trans
                      t={t}
                      i18nKey="general.actions.duration"
                      values={{ duration: locksService.getLockPeriodsMultiplier(activeDelegation.conviction) }}
                      components={{
                        balance: <AssetBalance value={activeDelegation.balance} asset={chain.assets[0]!} />,
                      }}
                    />
                  </BodyText>
                </Box>

                <Box padding={[0, 3]} horizontalAlign="start">
                  <Tooltip side="bottom">
                    <Tooltip.Trigger>
                      <div className="flex items-center gap-1">
                        <FootnoteText>{activeTracks[account.accountId].size || 0}</FootnoteText>

                        <Icon className="group-hover:text-icon-hover" name="info" size={16} />
                      </div>
                    </Tooltip.Trigger>
                    <Tooltip.Content>
                      {[...activeTracks[account.accountId]]
                        .map((trackId) => t(allTracks.find((track) => track.id === trackId)?.value || ''))
                        .join(', ')}
                    </Tooltip.Content>
                  </Tooltip>
                </Box>

                <Box horizontalAlign="center">
                  {accounts.length > 1 && (
                    <IconButton
                      name="edit"
                      onClick={() =>
                        delegate &&
                        editDelegationModel.events.flowStarted({
                          delegate,
                          accounts: [accounts[index]],
                        })
                      }
                    />
                  )}
                </Box>

                <Box horizontalAlign="center">
                  {accounts.length > 1 && (
                    <IconButton
                      name="delete"
                      onClick={() =>
                        delegate &&
                        revokeDelegationModel.flowStarted({
                          delegate: delegate.accountId,
                          accounts: [accounts[index]],
                        })
                      }
                    />
                  )}
                </Box>
              </li>
            );
          })}
        </ul>
      </Modal.Content>
      <Modal.Footer>
        <Box fitContainer direction="row" horizontalAlign="space-between" verticalAlign="center">
          <FootnoteText className="text-text-tertiary">
            {t('governance.delegationDetails.accountsCounter', { count: accounts.length || 0 })}
          </FootnoteText>
          <Box direction="row" gap={2}>
            <Button
              pallet="secondary"
              disabled={!selectedAccounts.length}
              onClick={() =>
                delegate &&
                revokeDelegationModel.flowStarted({
                  delegate: delegate.accountId,
                  accounts: selectedAccounts,
                })
              }
            >
              {t('governance.delegationDetails.revokeDelegationButton', { count: selectedAccounts.length })}
            </Button>
            <Button
              disabled={!selectedAccounts.length}
              onClick={() =>
                delegate &&
                editDelegationModel.events.flowStarted({
                  delegate,
                  accounts: selectedAccounts,
                })
              }
            >
              {t('governance.delegationDetails.editDelegationButton', { count: selectedAccounts.length })}
            </Button>
          </Box>
        </Box>
      </Modal.Footer>
    </Modal>
  );
};
