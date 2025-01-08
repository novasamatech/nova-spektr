import { useUnit } from 'effector-react';
import { useState } from 'react';
import { Trans } from 'react-i18next';

import { type Account } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { nonNullable, toAddress } from '@/shared/lib/utils';
import { BodyText, Button, FootnoteText, Icon, IconButton } from '@/shared/ui';
import { AccountExplorers } from '@/shared/ui-entities';
import { Box, Checkbox, Modal, Tooltip } from '@/shared/ui-kit';
import { AssetBalance } from '@/entities/asset';
import { allTracks, votingService } from '@/entities/governance';
import { ContactItem, accountUtils, walletModel } from '@/entities/wallet';
import { editDelegationModel } from '@/widgets/EditDelegationModal';
import { revokeDelegationModel } from '@/widgets/RevokeDelegationModal';
import { delegateDetailsModel } from '../model/delegate-details-model';

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

  const accounts =
    wallet?.accounts.filter(
      (account) =>
        chain &&
        accountUtils.isChainAndCryptoMatch(account, chain) &&
        activeAccounts.includes(toAddress(account.accountId, { prefix: chain.addressPrefix })),
    ) || [];

  if (!chain) return null;

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
        return wallet?.accounts.find((a) => toAddress(a.accountId) === address);
      });

      setSelectedAccounts(selectableAccounts.filter(nonNullable));
    }
  };

  return (
    <Modal
      size="lg"
      isOpen={isOpen}
      onToggle={(state) => {
        if (!state) delegateDetailsModel.events.closeDelegationsModal();
      }}
    >
      <Modal.Title close>{t('governance.delegationDetails.yourDelegationsTitle')}</Modal.Title>
      <Modal.Content>
        <div className="mx-2 my-4 flex max-h-[518px] flex-col gap-2">
          <div className="flex items-center">
            <div className="flex w-10 items-center justify-center">
              <Checkbox
                checked={selectedAccounts.length === activeAccounts.length}
                semiChecked={selectedAccounts.length > 0}
                onChange={toggleAllAccounts}
              />
            </div>

            <FootnoteText className="flex-1 px-3 text-text-tertiary">
              {t('governance.addDelegation.accountsLabel', { count: 1 })}
            </FootnoteText>
            <FootnoteText className="flex w-[168px] justify-end px-3 text-text-tertiary">
              {t('governance.addDelegation.votesLabel')}
            </FootnoteText>
            <FootnoteText className="w-[62px] px-3 text-text-tertiary">
              {t('governance.addDelegation.tracksLabel')}
            </FootnoteText>
            <div className="w-11"></div>
            <div className="w-11"></div>
          </div>

          {activeAccounts.map((address, index) => {
            const account = wallet?.accounts.find((a) => toAddress(a.accountId) === address);
            const activeDelegation = activeDelegations[address];

            if (!account || !activeDelegation || !activeTracks[address]) return null;

            return (
              <div key={address} className="flex h-[52px] items-center">
                <div className="flex w-10 items-center justify-center">
                  <Checkbox checked={selectedAccounts.includes(account)} onChange={() => toggleAccount(account)} />
                </div>
                <div className="flex-1 px-3">
                  <ContactItem
                    name={account.name}
                    address={account.accountId}
                    keyType={
                      accountUtils.isVaultShardAccount(account) || accountUtils.isVaultChainAccount(account)
                        ? account.keyType
                        : undefined
                    }
                  >
                    <AccountExplorers accountId={account.accountId} chain={chain} />
                  </ContactItem>
                </div>
                <div className="flex w-[168px] flex-col items-end justify-center px-3">
                  <BodyText>
                    <Trans
                      t={t}
                      i18nKey="governance.addDelegation.votesValue"
                      components={{
                        votes: (
                          <AssetBalance
                            value={votingService.calculateVotingPower(
                              activeDelegation.balance,
                              activeDelegation.conviction,
                            )}
                            asset={chain.assets[0]}
                            showSymbol={false}
                          />
                        ),
                      }}
                    />
                  </BodyText>
                  <FootnoteText>
                    <Trans
                      t={t}
                      i18nKey="governance.addDelegation.balanceValue"
                      values={{ conviction: votingService.getConvictionMultiplier(activeDelegation.conviction) }}
                      components={{
                        balance: <AssetBalance value={activeDelegation.balance} asset={chain.assets[0]} />,
                      }}
                    />
                  </FootnoteText>
                </div>
                <div className="w-[62px] px-3">
                  <Tooltip side="bottom">
                    <Tooltip.Trigger>
                      <div className="flex gap-1">
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
                </div>
                <div className="w-11 items-center justify-center">
                  {accounts?.length > 1 && (
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
                </div>
                <div className="w-11 items-center justify-center">
                  {accounts?.length > 1 && (
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
                </div>
              </div>
            );
          })}
        </div>
      </Modal.Content>
      <Modal.Footer>
        <Box fitContainer direction="row" horizontalAlign="space-between" verticalAlign="center">
          <FootnoteText className="text-text-tertiary">
            {t('governance.delegationDetails.accountsCounter', { count: accounts?.length || 0 })}
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
