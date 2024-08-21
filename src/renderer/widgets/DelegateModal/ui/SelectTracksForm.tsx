import { useUnit } from 'effector-react';

import { useI18n } from '@/app/providers';
import { toAddress, toShortAddress } from '@/shared/lib/utils';
import { BaseModal, Button, Checkbox, FootnoteText, Icon, MultiSelect, SmallTitleText, Tooltip } from '@/shared/ui';
import { OperationTitle } from '@/entities/chain';
import { AccountAddress, accountUtils } from '@/entities/wallet';
import { votingAssetModel } from '@/features/governance';
import { getTrackIds, getTrackPallet, getTreasuryTrackDescription } from '../lib/helpers';
import { delegateModel } from '../model/delegate-model';
import { selectTracksModel } from '../model/select-tracks-model';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export const SelectTrackForm = ({ isOpen, onClose }: Props) => {
  const { t } = useI18n();

  const chain = useUnit(selectTracksModel.$chain);
  const tracks = useUnit(selectTracksModel.$tracks);
  const accounts = useUnit(selectTracksModel.$accounts);
  const votedTracks = useUnit(selectTracksModel.$votedTracks);
  const tracksGroup = useUnit(selectTracksModel.$tracksGroup);
  const allTracks = useUnit(selectTracksModel.$allTracks);
  const asset = useUnit(votingAssetModel.$votingAsset);

  const { adminTracks, governanceTracks, treasuryTracks, fellowshipTracks } = tracksGroup;

  return (
    <BaseModal
      closeButton
      headerClass="px-5 py-3"
      panelClass="flex h-[678px] w-[896px] flex-col bg-white"
      contentClass="flex min-h-0 w-full flex-1 flex-col gap-6 bg-card-background py-4"
      isOpen={isOpen}
      title={chain && <OperationTitle title={t('governance.addDelegation.title')} chainId={chain.chainId} />}
      onClose={onClose}
    >
      <SmallTitleText className="px-5">{t('governance.addDelegation.selectTrackTitle')}</SmallTitleText>

      <hr className="w-full border-filter-border" />

      <AccountsSelector />

      <div className="flex flex-1 flex-col gap-6 px-5">
        <div className="flex gap-3">
          <Button
            pallet={getTrackPallet(allTracks, votedTracks, tracks)}
            variant="chip"
            onClick={() => selectTracksModel.events.tracksSelected(getTrackIds(allTracks, votedTracks))}
          >
            {t('governance.addDelegation.group.selectAll')}
          </Button>
          <Button
            pallet={getTrackPallet(adminTracks, votedTracks, tracks)}
            variant="chip"
            onClick={() => selectTracksModel.events.tracksSelected(getTrackIds(adminTracks, votedTracks))}
          >
            {t('governance.addDelegation.group.admin')}
          </Button>
          <Button
            pallet={getTrackPallet(governanceTracks, votedTracks, tracks)}
            variant="chip"
            onClick={() => selectTracksModel.events.tracksSelected(getTrackIds(governanceTracks, votedTracks))}
          >
            {t('governance.addDelegation.group.governance')}
          </Button>
          <Button
            pallet={getTrackPallet(treasuryTracks, votedTracks, tracks)}
            variant="chip"
            onClick={() => selectTracksModel.events.tracksSelected(getTrackIds(treasuryTracks, votedTracks))}
          >
            {t('governance.addDelegation.group.treasury')}
          </Button>
          <Button
            pallet={getTrackPallet(fellowshipTracks, votedTracks, tracks)}
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
                checked={tracks.includes(Number(track.id))}
                disabled={votedTracks.includes(track.id)}
                onChange={() => selectTracksModel.events.trackToggled(Number(track.id))}
              >
                <div className="flex w-full items-center justify-between">
                  {t(track.value)}
                  <Tooltip content={t(track.description)} pointer="up">
                    <Icon size={16} name="info" />
                  </Tooltip>
                </div>
              </Checkbox>
            ))}
          </div>
          <div className="flex flex-1 flex-col gap-4">
            {governanceTracks.map((track) => (
              <Checkbox
                key={track.id}
                checked={tracks.includes(Number(track.id))}
                disabled={votedTracks.includes(track.id)}
                onChange={() => selectTracksModel.events.trackToggled(Number(track.id))}
              >
                <div className="flex w-full items-center justify-between">
                  {t(track.value)}
                  <Tooltip content={t(track.description)} offsetPx={-50}>
                    <Icon size={16} name="info" />
                  </Tooltip>
                </div>
              </Checkbox>
            ))}
          </div>
          <div className="flex flex-1 flex-col gap-4">
            {treasuryTracks.map((track) => (
              <Checkbox
                key={track.id}
                checked={tracks.includes(Number(track.id))}
                disabled={votedTracks.includes(track.id)}
                onChange={() => selectTracksModel.events.trackToggled(Number(track.id))}
              >
                <div className="flex w-full items-center justify-between">
                  {t(track.value)}
                  <Tooltip content={getTreasuryTrackDescription(asset, track.description, t)} offsetPx={-80}>
                    <Icon size={16} name="info" />
                  </Tooltip>
                </div>
              </Checkbox>
            ))}
          </div>
          <div className="flex flex-1 flex-col gap-4">
            {fellowshipTracks.map((track) => (
              <Checkbox
                key={track.id}
                checked={tracks.includes(Number(track.id))}
                disabled={votedTracks.includes(track.id)}
                onChange={() => selectTracksModel.events.trackToggled(Number(track.id))}
              >
                <div className="flex w-full items-center justify-between">
                  {t(track.value)}
                  <Tooltip content={t(track.description)} offsetPx={-60}>
                    <Icon size={16} name="info" />
                  </Tooltip>
                </div>
              </Checkbox>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-end px-5">
        <Button
          disabled={tracks.length === 0 || accounts.length === 0}
          onClick={() => selectTracksModel.output.formSubmitted({ tracks, accounts })}
        >
          {t('governance.addDelegation.continueButton')}
        </Button>
      </div>
    </BaseModal>
  );
};

const AccountsSelector = () => {
  const { t } = useI18n();

  const accounts = useUnit(selectTracksModel.$accounts);
  const availableAccounts = useUnit(selectTracksModel.$availableAccounts);
  const { wallet, chain } = useUnit(delegateModel.$walletData);

  if (!wallet || !chain || wallet.accounts.length <= 1) {
    return null;
  }

  const options =
    availableAccounts.map((account) => {
      const isShard = accountUtils.isShardAccount(account);
      const address = toAddress(account.accountId, { prefix: chain.addressPrefix });

      return {
        id: account.id.toString(),
        value: account,
        element: (
          <div className="flex w-full justify-between" key={account.id}>
            <AccountAddress
              size={20}
              type="short"
              address={address}
              name={isShard ? toShortAddress(address, 16) : account.name}
              canCopy={false}
            />
          </div>
        ),
      };
    }) || [];

  return (
    <>
      <div className="flex items-end gap-6 px-5">
        <div className="flex flex-1 flex-col gap-y-2">
          {/* TODO: Update multiselect for PV accounts */}
          <MultiSelect
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
