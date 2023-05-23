import cn from 'classnames';
import { KeyboardEvent, MouseEvent } from 'react';

import { Shimmering } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';
import { Balance } from '@renderer/domain/balance';
import { ChainId } from '@renderer/domain/shared-kernel';
import { useToggle } from '@renderer/shared/hooks';
import { totalAmount, transferableAmount } from '@renderer/shared/utils/balance';
import { KeyboardKey } from '@renderer/shared/utils/constants';
import { BodyText, IconButton } from '@renderer/components/ui-redesign';
import { BalanceNew } from '@renderer/components/common';
import { HelpText } from '@renderer/components/ui-redesign/Typography';
import Transfer from '@renderer/screens/Transfer/Transfer';

type DetailProp = { asset: Asset; value?: string; label: string; showShimmer?: boolean };
const AssetBalanceDetail = ({ asset, value, label }: DetailProp) => (
  <div className="flex flex-col flex-1 gap-y-0.5 pl-4">
    <HelpText as="dt" className="text-text-tertiary">
      {label}
    </HelpText>
    <dd>{value ? <BalanceNew value={value} asset={asset} /> : <Shimmering width={150} height={20} />}</dd>
  </div>
);

type Props = {
  asset: Asset;
  chainId: ChainId;
  balance?: Balance;
  canMakeActions?: boolean;
  onReceiveClick?: () => void;
};

const AssetBalanceCard = ({ asset, chainId, balance, canMakeActions, onReceiveClick }: Props) => {
  const { t } = useI18n();
  const [isExpanded, toggleExpanded] = useToggle();

  const onReceive = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onReceiveClick?.();
  };

  const onWrapperKeyDown = (event: KeyboardEvent<HTMLLIElement>) => {
    event.stopPropagation();

    if (event.currentTarget === event.target && event.key === KeyboardKey.ENTER) {
      toggleExpanded();
    }
  };

  const transferableBalance = balance?.free ? transferableAmount(balance) : undefined;
  // const isVerificationFailed = balance?.free && !balance?.verified;

  return (
    <li
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      className={cn('group cursor-pointer bg-block-background-default rounded flex flex-col hover:shadow-card-shadow')}
      onClick={toggleExpanded}
      onKeyDown={onWrapperKeyDown}
    >
      <div className="flex items-center py-1.5 px-2">
        <div className="flex items-center gap-x-2 px-2 py-1  mr-auto">
          <div
            className={cn(
              'relative flex items-center justify-center rounded-full w-9 h-9 bg-token-background',
              // isVerificationFailed ? 'border-alert bg-warning-gradient' : 'border-shade-30 bg-shade-70',
            )}
          >
            {/* TODO add back when design is ready */}
            {/*{isVerificationFailed && (*/}
            {/*  <div className="absolute top-0 left-0 w-4 h-4 bg-alert rounded-full flex justify-center items-center">*/}
            {/*    <Icon className="text-neutral-variant" name="shield" size={12} />*/}
            {/*  </div>*/}
            {/*)}*/}
            <img src={asset.icon} alt="" width={32} height={32} />
          </div>
          <BodyText>{asset.name}</BodyText>
        </div>
        {balance?.free ? (
          <BalanceNew value={totalAmount(balance)} asset={asset} />
        ) : (
          <Shimmering width={82} height={20} />
        )}
        {canMakeActions && (
          <div className="flex gap-x-2 ml-3">
            <Transfer chainId={chainId} assetId={asset.assetId} />
            <IconButton name="receiveArrow" onClick={onReceive} />
          </div>
        )}
      </div>

      {isExpanded && (
        <dl className="flex divide-x border-t border-divider gap-x-4 py-4 pr-4">
          <AssetBalanceDetail asset={asset} value={transferableBalance} label={t('assetBalance.transferable')} />
          <AssetBalanceDetail asset={asset} value={balance?.frozen} label={t('assetBalance.locked')} />
          <AssetBalanceDetail asset={asset} value={balance?.reserved} label={t('assetBalance.reserved')} />
        </dl>
      )}
    </li>
  );
};

export default AssetBalanceCard;
