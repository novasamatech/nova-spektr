import { type Chain, type FlexibleMultisigTransaction, type MultisigTransaction, type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw, copyToClipboard, truncate } from '@/shared/lib/utils';
import { DetailRow, FootnoteText, Icon } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { AssetBalance } from '@/entities/asset';
import { signatoryUtils } from '@/entities/signatory';
import { AddressWithExplorers, ExplorersPopover, WalletCardSm } from '@/entities/wallet';
import { AddressStyle, InteractionStyle } from '../common/constants';
import { getMultisigExtrinsicLink } from '../common/utils';

type Props = {
  tx: MultisigTransaction | FlexibleMultisigTransaction;
  wallets: Wallet[];
  chain: Chain;
};

export const OperationAdvancedDetails = ({ tx, wallets, chain }: Props) => {
  const { t } = useI18n();
  const { signatories, indexCreated, blockCreated, deposit, depositor, callHash, callData } = tx;
  const valueClass = 'text-text-secondary';

  const extrinsicLink = getMultisigExtrinsicLink(callHash, indexCreated, blockCreated, chain.explorers);
  const depositorSignatory = signatories.find((s) => s.accountId === depositor);
  const depositorWallet =
    depositorSignatory && signatoryUtils.getSignatoryWallet(wallets, depositorSignatory.accountId);

  const defaultAsset = chain.assets.at(0);

  if (!defaultAsset) {
    return null;
  }

  return (
    <Box gap={2}>
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
                explorers={chain.explorers}
                addressPrefix={chain.addressPrefix}
              />
            ) : (
              <AddressWithExplorers
                explorers={chain.explorers}
                accountId={depositorSignatory.accountId}
                name={depositorSignatory.name}
                addressFont={AddressStyle}
                addressPrefix={chain.addressPrefix}
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
    </Box>
  );
};
