import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { cnTw, getNativeAsset, nonNullable, truncate } from '@/shared/lib/utils';
import { Button, DetailRow, FootnoteText, Icon } from '@/shared/ui';
import { Account, AccountExplorers, AssetBalance, WalletIcon } from '@/shared/ui-entities';
import { Copy } from '@/shared/ui-kit';
import { type MultisigOperation } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { operationDetailsUtils } from '@/entities/operations';
import { signatoryUtils } from '@/entities/signatory';
import { walletModel } from '@/entities/wallet';
import { operationsContextModel } from '../model/context';

type Props = {
  operation: MultisigOperation;
};

const InteractionStyle =
  'rounded-sm hover:bg-action-background-hover hover:text-text-primary cursor-pointer py-[3px] px-2 -mr-2';

export const OperationAdvancedDetails = ({ operation }: Props) => {
  const { t } = useI18n();

  const wallets = useUnit(walletModel.$wallets);
  const chains = useUnit(networkModel.$chains);
  const chain = chains[operation.chainId];
  const account = useUnit(operationsContextModel.$multisigAccount);

  const nativeAsset = getNativeAsset(chain?.assets ?? []);
  const explorers = chain?.explorers;

  const [isAdvancedShown, toggleAdvanced] = useToggle();

  const { indexCreated, blockCreated, deposit, depositor, callHash, callData } = operation;

  const depositorSignatory = account?.signatories.find(s => s.accountId === depositor);
  const extrinsicLink = operationDetailsUtils.getMultisigExtrinsicLink(callHash, indexCreated, blockCreated, explorers);

  const valueClass = 'text-text-secondary';
  const depositorWallet =
    depositorSignatory && signatoryUtils.getSignatoryWallet(wallets, depositorSignatory.accountId);

  return (
    <>
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
              <Copy value={callHash}>
                <button type="button" className={cnTw('group flex items-center gap-x-1', InteractionStyle)}>
                  <FootnoteText className="text-inherit">{truncate(callHash, 7, 8)}</FootnoteText>
                  <Icon name="copy" size={16} className="group-hover:text-icon-hover" />
                </button>
              </Copy>
            </DetailRow>
          )}

          {callData && (
            <DetailRow label={t('operation.details.callData')} className={valueClass}>
              <Copy value={callData}>
                <button type="button" className={cnTw('group flex items-center gap-x-1', InteractionStyle)}>
                  <FootnoteText className="text-inherit">{truncate(callData, 7, 8)}</FootnoteText>
                  <Icon name="copy" size={16} className="group-hover:text-icon-hover" />
                </button>
              </Copy>
            </DetailRow>
          )}

          {deposit && nativeAsset && depositorSignatory && <hr className="border-divider" />}

          {depositorSignatory && nonNullable(chain) && (
            <DetailRow label={t('operation.details.depositor')} className={valueClass}>
              {depositorWallet ? (
                <div className="flex items-center gap-2">
                  <WalletIcon size={16} type={depositorWallet.type} />
                  <span>{depositorWallet.name}</span>
                  <AccountExplorers accountId={depositorSignatory.accountId} chain={chain} />
                </div>
              ) : (
                <div className="flex min-w-min">
                  <FootnoteText className="text-text-secondary">
                    <Account accountId={depositorSignatory.accountId} chain={chain} variant="short" />
                  </FootnoteText>
                </div>
              )}
            </DetailRow>
          )}

          {deposit && nativeAsset && (
            <DetailRow label={t('operation.details.deposit')} className={valueClass}>
              <AssetBalance
                value={deposit}
                asset={nativeAsset}
                className="py-[3px] text-footnote text-text-secondary"
              />
            </DetailRow>
          )}

          {deposit && nativeAsset && depositorSignatory && <hr className="border-divider" />}

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
    </>
  );
};
