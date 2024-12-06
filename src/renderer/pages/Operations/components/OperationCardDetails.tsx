import { useUnit } from 'effector-react';

import {
  type FlexibleMultisigAccount,
  type FlexibleMultisigTransaction,
  type MultisigAccount,
  type MultisigTransaction,
} from '@/shared/core';
import { useSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { cnTw, copyToClipboard, truncate } from '@/shared/lib/utils';
import { Button, DetailRow, FootnoteText, Icon } from '@/shared/ui';
import { AssetBalance } from '@/entities/asset';
import { type ExtendedChain } from '@/entities/network';
import { signatoryUtils } from '@/entities/signatory';
import { AddressWithExplorers, ExplorersPopover, WalletCardSm, walletModel } from '@/entities/wallet';
import { multisigOperationsFeature } from '@/features/multisig-operations';
import { AddressStyle, InteractionStyle } from '../common/constants';
import { getMultisigExtrinsicLink } from '../common/utils';

type Props = {
  tx: MultisigTransaction | FlexibleMultisigTransaction;
  account?: MultisigAccount | FlexibleMultisigAccount;
  extendedChain?: ExtendedChain;
};

export const OperationCardDetails = ({ tx, account, extendedChain }: Props) => {
  const { t } = useI18n();

  const wallets = useUnit(walletModel.$wallets);

  const defaultAsset = extendedChain?.assets[0];
  const addressPrefix = extendedChain?.addressPrefix;
  const explorers = extendedChain?.explorers;

  const [isAdvancedShown, toggleAdvanced] = useToggle();

  const { indexCreated, blockCreated, deposit, depositor, callHash, callData } = tx;

  const depositorSignatory = account?.signatories.find((s) => s.accountId === depositor);
  const extrinsicLink = getMultisigExtrinsicLink(callHash, indexCreated, blockCreated, explorers);

  const valueClass = 'text-text-secondary';
  const depositorWallet =
    depositorSignatory && signatoryUtils.getSignatoryWallet(wallets, depositorSignatory.accountId);

  const operationDetails = useSlot(multisigOperationsFeature.slots.operationDetails, {
    props: {
      operation: tx,
    },
  });

  return (
    <dl className="flex w-full flex-col gap-y-1">
      {operationDetails}

      <Button
        variant="text"
        pallet="primary"
        size="sm"
        suffixElement={<Icon name={isAdvancedShown ? 'up' : 'down'} size={16} />}
        className="-ml-2 w-fit text-action-text-default hover:text-action-text-default"
        onClick={toggleAdvanced}
      >
        {t('operation.advanced')}
      </Button>

      {isAdvancedShown && (
        <>
          {callHash && (
            <DetailRow label={t('operation.details.callHash')} className={valueClass}>
              <button
                type="button"
                className={cnTw('group flex items-center gap-x-1', InteractionStyle)}
                onClick={() => copyToClipboard(callHash)}
              >
                <FootnoteText className="text-inherit">{truncate(callHash, 7, 8)}</FootnoteText>
                <Icon name="copy" size={16} className="group-hover:text-icon-hover" />
              </button>
            </DetailRow>
          )}

          {callData && (
            <DetailRow label={t('operation.details.callData')} className={valueClass}>
              <button
                type="button"
                className={cnTw('group flex items-center gap-x-1', InteractionStyle)}
                onClick={() => copyToClipboard(callData)}
              >
                <FootnoteText className="text-inherit">{truncate(callData, 7, 8)}</FootnoteText>
                <Icon name="copy" size={16} className="group-hover:text-icon-hover" />
              </button>
            </DetailRow>
          )}

          {deposit && defaultAsset && depositorSignatory && <hr className="border-divider" />}

          {depositorSignatory && (
            <DetailRow label={t('operation.details.depositor')} className={valueClass}>
              <div className="-mr-2">
                {depositorWallet ? (
                  <ExplorersPopover
                    button={<WalletCardSm wallet={depositorWallet} />}
                    address={depositorSignatory.accountId}
                    explorers={explorers}
                    addressPrefix={addressPrefix}
                  />
                ) : (
                  <AddressWithExplorers
                    explorers={explorers}
                    accountId={depositorSignatory.accountId}
                    name={depositorSignatory.name}
                    addressFont={AddressStyle}
                    addressPrefix={addressPrefix}
                    wrapperClassName="min-w-min"
                    type="short"
                  />
                )}
              </div>
            </DetailRow>
          )}

          {deposit && defaultAsset && (
            <DetailRow label={t('operation.details.deposit')} className={valueClass}>
              <AssetBalance
                value={deposit}
                asset={defaultAsset}
                showIcon={false}
                className="py-[3px] text-footnote text-text-secondary"
              />
            </DetailRow>
          )}

          {deposit && defaultAsset && depositorSignatory && <hr className="border-divider" />}

          {indexCreated && blockCreated && (
            <DetailRow label={t('operation.details.timePoint')} className={valueClass}>
              {extrinsicLink ? (
                <a
                  className={cnTw('group flex items-center gap-x-1', InteractionStyle)}
                  href={extrinsicLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FootnoteText className="text-text-secondary">
                    {blockCreated}-{indexCreated}
                  </FootnoteText>
                  <Icon name="globe" size={16} className="group-hover:text-icon-hover" />
                </a>
              ) : (
                `${blockCreated}-${indexCreated}`
              )}
            </DetailRow>
          )}
        </>
      )}
    </dl>
  );
};
