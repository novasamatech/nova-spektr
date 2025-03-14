import { useUnit } from 'effector-react';
import { useState } from 'react';
import { Trans } from 'react-i18next';

import { type Account } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw, nonNullable, toAddress } from '@/shared/lib/utils';
import { BodyText, Button, FootnoteText, Icon, IconButton } from '@/shared/ui';
import { Account as AccountAddress, AssetBalance } from '@/shared/ui-entities';
import { Box, Checkbox, Modal, Tooltip } from '@/shared/ui-kit';
import { allTracks } from '@/entities/governance';
import { accountUtils, walletModel } from '@/entities/wallet';
import { editDelegationModel } from '@/widgets/EditDelegationModal';
import { revokeDelegationModel } from '@/widgets/RevokeDelegationModal';
import { delegateDetailsModel } from '../model/delegate-details-model';

const GRID_TEMPLATE = 'grid-cols-[40px,284px,166px,128px,62px,44px,44px]';

export const YourDelegations = () => {
  const { t } = useI18n();

  const isOpen = useUnit(delegateDetailsModel.$isDelegationsOpen);
  const chain = useUnit(delegateDetailsModel.$chain);
  const activeAccounts = useUnit(delegateDetailsModel.$activeAccounts);
  const activeDelegations = useUnit(delegateDetailsModel.$activeDelegations);
  const activeTracks = useUnit(delegateDetailsModel.$activeTracks);
  const delegate = useUnit(delegateDetailsModel.$delegate);
  const wallet = useUnit(walletModel.$activeWallet);

  const [selectedAccounts, setSelectedAccounts] = useState<Account[]>([]);

  if (!chain) return null;

  const accounts =
    wallet?.accounts.filter((account) => {
      const isChainMatch = accountUtils.isChainAndCryptoMatch(account, chain);
      const accountExist = activeAccounts.includes(toAddress(account.accountId, { prefix: chain.addressPrefix }));

      return isChainMatch && accountExist;
    }) || [];

  const toggleAccount = (account: Account) => {
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
      const selectableAccounts = activeAccounts.map((address) => {
        return wallet?.accounts.find((a) => toAddress(a.accountId, { prefix: chain.addressPrefix }) === address);
      });

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
        <div className={cnTw('mx-2 mb-2 mt-4 grid grid-flow-row items-center', GRID_TEMPLATE)}>
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
            {t('governance.addDelegation.amountMultiply')}
          </FootnoteText>
          <FootnoteText className="justify-self-end px-3 text-text-tertiary">
            {t('governance.addDelegation.votesLabel')}
          </FootnoteText>
          <FootnoteText className="px-3 text-text-tertiary">{t('governance.addDelegation.tracksLabel')}</FootnoteText>
        </div>

        <ul className="mx-2 mb-4 flex flex-col gap-y-2">
          {activeAccounts.map((address, index) => {
            const activeDelegation = activeDelegations[address];

            const account = wallet?.accounts.find((a) => {
              return toAddress(a.accountId, { prefix: chain.addressPrefix }) === address;
            });

            if (!account || !activeDelegation || !activeTracks[address]) return null;

            return (
              <li key={address} className={cnTw('grid h-13 grid-flow-row items-center', GRID_TEMPLATE)}>
                <Box direction="row" horizontalAlign="center" verticalAlign="center">
                  <Checkbox checked={selectedAccounts.includes(account)} onChange={() => toggleAccount(account)} />
                </Box>

                <Box padding={[0, 3, 0, 3]} verticalAlign="center">
                  <AccountAddress
                    iconSize={20}
                    title={account.name}
                    accountId={account.accountId}
                    chain={chain}
                    variant="truncate"
                  />
                </Box>

                <BodyText>
                  <Trans
                    t={t}
                    i18nKey="general.actions.multiply"
                    values={{ multiplier: activeDelegation.conviction }}
                    components={{ balance: <AssetBalance value={activeDelegation.balance} asset={chain.assets[0]} /> }}
                  />
                </BodyText>

                <Box padding={[0, 3, 0, 3]} direction="column" horizontalAlign="end" verticalAlign="center">
                  <Tooltip side="bottom">
                    <Tooltip.Trigger>
                      <div className="flex items-center gap-1">
                        <FootnoteText>{activeTracks[address].size || 0}</FootnoteText>

                        <Icon className="group-hover:text-icon-hover" name="info" size={16} />
                      </div>
                    </Tooltip.Trigger>
                    <Tooltip.Content>
                      {[...activeTracks[address]]
                        .map((trackId) => t(allTracks.find((track) => track.id === trackId)?.value || ''))
                        .join(', ')}
                    </Tooltip.Content>
                  </Tooltip>
                </Box>

                <Box direction="column" horizontalAlign="center" verticalAlign="center">
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

                <Box direction="column" horizontalAlign="center" verticalAlign="center">
                  {accounts.length > 1 && (
                    <IconButton
                      name="delete"
                      onClick={() =>
                        delegate &&
                        revokeDelegationModel.events.flowStarted({
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
                revokeDelegationModel.events.flowStarted({
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
