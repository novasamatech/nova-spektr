import { BN } from '@polkadot/util';
import { useUnit } from 'effector-react';
import { useState } from 'react';

import { type Account, type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { toAddress } from '@/shared/lib/utils';
import { Alert, Button, FootnoteText, Icon, SmallTitleText } from '@/shared/ui';
import { AccountExplorers, Address } from '@/shared/ui-entities';
import { Checkbox, Modal, Tooltip } from '@/shared/ui-kit';
import { AssetBalance } from '@/entities/asset';
import { OperationTitle } from '@/entities/chain';
import {
  getGovernanceTrackDescription,
  getGroupPallet,
  getTrackIds,
  getTrackTitles,
  getTreasuryTrackDescription,
} from '@/entities/governance';
import { accountUtils } from '@/entities/wallet';
import { AccountsMultiSelector, networkSelectorModel } from '@/features/governance';
import { RemoveVotesModal } from '@/widgets/RemoveVotesModal';
import { editDelegationModel } from '../model/edit-delegation-model';
import { selectTracksModel } from '../model/select-tracks-model';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export const SelectTrackForm = ({ isOpen, onClose }: Props) => {
  const { t } = useI18n();
  const [showRemoveVoteModal, setShowRemoveVoteModal] = useState(false);

  const tracks = useUnit(selectTracksModel.$tracks);
  const accounts = useUnit(selectTracksModel.$accounts);
  const votedTracks = useUnit(selectTracksModel.$votedTracks);
  const delegatedTracks = useUnit(selectTracksModel.$delegatedTracks);
  const tracksGroup = useUnit(selectTracksModel.$tracksGroup);
  const allTracks = useUnit(selectTracksModel.$allTracks);
  const isMaxWeightReached = useUnit(selectTracksModel.$isMaxWeightReached);
  const isMaxWeightLoading = useUnit(selectTracksModel.$isMaxWeightLoading);
  const network = useUnit(networkSelectorModel.$network);
  const votesToRemove = useUnit(selectTracksModel.$votesToRemove);

  const { adminTracks, governanceTracks, treasuryTracks, fellowshipTracks } = tracksGroup;

  if (!network) return null;

  return (
    <Modal isOpen={isOpen} size="fit" onToggle={(isOpen) => !isOpen && onClose()}>
      <Modal.Title close>
        <OperationTitle title={t('operations.modalTitles.editDelegationOn')} chainId={network.chain.chainId} />
      </Modal.Title>
      <Modal.Content>
        <div className="flex h-[582px] w-[896px] flex-col gap-6 bg-card-background">
          <SmallTitleText className="px-5">{t('governance.addDelegation.selectTrackTitle')}</SmallTitleText>

          <hr className="w-full border-filter-border" />

          <AccountsSelector />

          <div className="flex flex-1 flex-col gap-6 px-5">
            <div className="flex gap-3">
              <Button
                disabled={accounts.length === 0}
                pallet={getGroupPallet(allTracks, votedTracks, tracks)}
                variant="chip"
                onClick={() => selectTracksModel.events.tracksSelected(getTrackIds(allTracks, votedTracks))}
              >
                {t('governance.addDelegation.group.selectAll')}
              </Button>
              <Button
                disabled={accounts.length === 0}
                pallet={getGroupPallet(governanceTracks, votedTracks, tracks)}
                variant="chip"
                onClick={() => selectTracksModel.events.tracksSelected(getTrackIds(governanceTracks, votedTracks))}
              >
                {t('governance.addDelegation.group.governance')}
              </Button>
              <Button
                disabled={accounts.length === 0}
                pallet={getGroupPallet(treasuryTracks, votedTracks, tracks)}
                variant="chip"
                onClick={() => selectTracksModel.events.tracksSelected(getTrackIds(treasuryTracks, votedTracks))}
              >
                {t('governance.addDelegation.group.treasury')}
              </Button>
              <Button
                disabled={accounts.length === 0}
                pallet={getGroupPallet(fellowshipTracks, votedTracks, tracks)}
                variant="chip"
                onClick={() => selectTracksModel.events.tracksSelected(getTrackIds(fellowshipTracks, votedTracks))}
              >
                {t('governance.addDelegation.group.fellowship')}
              </Button>
            </div>
            <div className="flex gap-6">
              <div className="flex flex-1 flex-col gap-4">
                {adminTracks.map((track) => (
                  <Checkbox
                    key={track.id}
                    checked={tracks.includes(Number(track.id)) || votedTracks.includes(track.id)}
                    disabled={votedTracks.includes(track.id) || accounts.length === 0}
                    onChange={() => selectTracksModel.events.trackToggled(Number(track.id))}
                  >
                    <div className="flex w-full items-center justify-between">
                      {t(track.value)}
                      <Tooltip side="bottom">
                        <Tooltip.Trigger>
                          <div>
                            <Icon size={16} name="info" />
                          </div>
                        </Tooltip.Trigger>
                        <Tooltip.Content>{t(track.description)}</Tooltip.Content>
                      </Tooltip>
                    </div>
                  </Checkbox>
                ))}
              </div>
              <div className="flex flex-1 flex-col gap-4">
                {governanceTracks.map((track) => (
                  <Checkbox
                    key={track.id}
                    checked={tracks.includes(Number(track.id)) || votedTracks.includes(track.id)}
                    disabled={votedTracks.includes(track.id) || accounts.length === 0}
                    onChange={() => selectTracksModel.events.trackToggled(Number(track.id))}
                  >
                    <div className="flex w-full items-center justify-between">
                      {t(track.value)}
                      <Tooltip side="bottom">
                        <Tooltip.Trigger>
                          <div>
                            <Icon size={16} name="info" />
                          </div>
                        </Tooltip.Trigger>
                        <Tooltip.Content>
                          {getGovernanceTrackDescription(network.asset, track.description, t)}
                        </Tooltip.Content>
                      </Tooltip>
                    </div>
                  </Checkbox>
                ))}
              </div>
              <div className="flex flex-1 flex-col gap-4">
                {treasuryTracks.map((track) => (
                  <Checkbox
                    key={track.id}
                    checked={tracks.includes(Number(track.id)) || votedTracks.includes(track.id)}
                    disabled={votedTracks.includes(track.id) || accounts.length === 0}
                    onChange={() => selectTracksModel.events.trackToggled(Number(track.id))}
                  >
                    <div className="flex w-full items-center justify-between">
                      {t(track.value)}
                      <Tooltip side="bottom">
                        <Tooltip.Trigger>
                          <div>
                            <Icon size={16} name="info" />
                          </div>
                        </Tooltip.Trigger>
                        <Tooltip.Content>
                          {getTreasuryTrackDescription(network.asset, track.description, t)}
                        </Tooltip.Content>
                      </Tooltip>
                    </div>
                  </Checkbox>
                ))}
              </div>
              <div className="flex flex-1 flex-col gap-4">
                {fellowshipTracks.map((track) => (
                  <Checkbox
                    key={track.id}
                    checked={tracks.includes(Number(track.id)) || votedTracks.includes(track.id)}
                    disabled={votedTracks.includes(track.id) || accounts.length === 0}
                    onChange={() => selectTracksModel.events.trackToggled(Number(track.id))}
                  >
                    <div className="flex w-full items-center justify-between">
                      {t(track.value)}
                      <Tooltip side="bottom">
                        <Tooltip.Trigger>
                          <div>
                            <Icon size={16} name="info" />
                          </div>
                        </Tooltip.Trigger>
                        <Tooltip.Content>{t(track.description)}</Tooltip.Content>
                      </Tooltip>
                    </div>
                  </Checkbox>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 px-5">
            <Alert variant="error" active={isMaxWeightReached} title={t('governance.addDelegation.maxWeightError')}>
              <Alert.Item withDot={false}>{t('governance.addDelegation.maxWeightErrorDescription')} </Alert.Item>
            </Alert>

            <Alert
              variant="info"
              active={accounts.length > 0 && delegatedTracks?.length > 0}
              title={t('governance.addDelegation.delegatedTracksTitle')}
            >
              <Alert.Item withDot={false}>
                {t('governance.addDelegation.delegatedTracksDescription', {
                  tracks: getTrackTitles(delegatedTracks, allTracks, t),
                })}
              </Alert.Item>
            </Alert>

            <Alert
              variant="info"
              active={accounts.length > 0 && votesToRemove.length > 0}
              title={t('governance.addDelegation.votedTracksTitle')}
            >
              <Alert.Item withDot={false}>
                {t('governance.addDelegation.votedTracksDescription', {
                  tracks: getTrackTitles(
                    votesToRemove.map(({ track }) => track),
                    allTracks,
                    t,
                  ),
                })}
              </Alert.Item>
              <Alert.Item withDot={false}>
                <Button variant="text" size="sm" className="p-0" onClick={() => setShowRemoveVoteModal(true)}>
                  {t('governance.addDelegation.removeVotesButton')}
                </Button>
              </Alert.Item>
              {showRemoveVoteModal && votesToRemove.length > 0 && (
                <RemoveVotesModal
                  votes={votesToRemove}
                  chain={network.chain}
                  asset={network.asset}
                  api={network.api}
                  onClose={() => setShowRemoveVoteModal(false)}
                />
              )}
            </Alert>
          </div>
        </div>
      </Modal.Content>
      <Modal.Footer>
        <Button
          disabled={tracks.length === 0 || accounts.length === 0 || isMaxWeightReached || isMaxWeightLoading}
          isLoading={isMaxWeightLoading}
          onClick={() => selectTracksModel.output.formSubmitted({ tracks, accounts })}
        >
          {t('governance.addDelegation.continueButton')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

const AccountsSelector = () => {
  const { t } = useI18n();

  const accounts = useUnit(selectTracksModel.$accounts);
  const availableAccounts = useUnit(selectTracksModel.$availableAccounts);
  const accountsBalances = useUnit(selectTracksModel.$accountsBalances);
  const { wallet, chain } = useUnit(editDelegationModel.$walletData);

  if (!wallet || !chain || availableAccounts.length <= 1) {
    return null;
  }

  const groups = accountUtils.getAccountsAndShardGroups(availableAccounts);

  const options =
    groups.map((shards) => {
      const isAccountWithShards = accountUtils.isAccountWithShards(shards);
      if (isAccountWithShards) {
        const groupValue = shards.reduce((acc, curr) => acc.add(new BN(accountsBalances[curr.accountId])), new BN(0));

        return {
          id: '',
          value: '',
          group: {
            groupName: shards[0].name,
            groupValue: (
              <AssetBalance value={groupValue} asset={chain.assets[0]} className="text-footnote text-inherit" />
            ),
            list: shards.map((account) => ({
              id: account.id.toString(),
              value: account,
              element: (
                <Address
                  address={toAddress(account.accountId, { prefix: chain.addressPrefix })}
                  variant="short"
                  canCopy={false}
                  showIcon
                />
              ),
              additionalElement: (
                <AccountInfo account={account} chain={chain} balance={accountsBalances[account.accountId]} />
              ),
            })),
          },
        };
      }
      const address = toAddress(shards.accountId, { prefix: chain.addressPrefix });

      return {
        id: shards.id.toString(),
        value: shards,
        element: <Address title={shards.name} address={address} variant="short" canCopy={false} showIcon />,
        additionalElement: <AccountInfo account={shards} chain={chain} balance={accountsBalances[shards.accountId]} />,
      };
    }) || [];

  return (
    <>
      <div className="flex items-end gap-6 px-5">
        <div className="flex flex-1 flex-col gap-y-2">
          <AccountsMultiSelector
            label={t('governance.addDelegation.accountLabel')}
            placeholder={t('governance.addDelegation.accountPlaceholder')}
            multiPlaceholder={t('governance.addDelegation.manyAccountsPlaceholder')}
            selectedIds={accounts.map(({ id }) => id.toString())}
            options={options}
            onChange={(values) => selectTracksModel.events.accountsChanged(values.map(({ value }) => value))}
          />
        </div>
        <FootnoteText className="flex-1 text-text-tertiary">
          {t('governance.addDelegation.multishardDescription')}
        </FootnoteText>
      </div>

      <hr className="w-full border-filter-border" />
    </>
  );
};

type AccountProps = {
  account: Account;
  chain: Chain;
  balance: string;
};

const AccountInfo = ({ account, chain, balance }: AccountProps) => (
  <div className="flex w-full items-center text-center">
    <div className="w-8">
      <AccountExplorers accountId={account.accountId} chain={chain} />
    </div>
    <AssetBalance
      value={balance}
      asset={chain.assets[0]}
      className="w-full text-right text-footnote text-text-secondary"
    />
  </div>
);
