import { BodyText, FootnoteText, Icon, InfoPopover, CaptionText } from '@shared/ui';
import { cnTw } from '@shared/lib/utils';
import { IconNames } from '@shared/ui/Icon/data';
import { KeyType, ChainAccount, ShardAccount } from '@shared/core';
import { useDerivedInfo } from '@entities/wallet/lib/useDerivedInfo';
import { accountUtils } from '@entities/wallet';

const KeyIcon: Record<KeyType, IconNames> = {
  [KeyType.CUSTOM]: 'keyCustom',
  [KeyType.GOVERNANCE]: 'keyGovernance',
  [KeyType.HOT]: 'keyHot',
  [KeyType.MAIN]: 'keyMain',
  [KeyType.PUBLIC]: 'keyPublic',
  [KeyType.STAKING]: 'keyStaking',
};

type Props = {
  account: ChainAccount | ShardAccount[];
  showDerivationPath?: boolean;
  iconSize?: number;
  className?: string;
};

export const DerivedAccount = ({ account, showDerivationPath, iconSize = 30, className }: Props) => {
  const isShardedAccount = Array.isArray(account);
  const typedAccount = isShardedAccount ? account[0] : account;

  const popoverItems = useDerivedInfo({ derivationPath: accountUtils.getDerivationPath(account) });

  return (
    <InfoPopover
      data={popoverItems}
      position="right-0 top-full"
      className="w-[230px]"
      buttonClassName="w-full"
      containerClassName="w-full"
    >
      <div
        className={cnTw(
          'flex items-center w-full gap-x-2 px-2 h-8 cursor-pointer text-text-secondary',
          'group hover:bg-action-background-hover hover:text-text-primary rounded',
          className,
        )}
      >
        {isShardedAccount ? (
          <div className="flex items-center justify-center w-7.5 h-5 rounded-2lg bg-input-background-disabled">
            <CaptionText className="text-text-secondary">{account.length}</CaptionText>
          </div>
        ) : (
          <Icon size={iconSize} name={KeyIcon[typedAccount.keyType]} className="shrink-0 text-text-secondary" />
        )}

        <BodyText className="text-text-secondary">{typedAccount.name}</BodyText>
        <FootnoteText
          align="right"
          className={cnTw(
            'flex-1 text-text-tertiary transition-opacity opacity-0',
            showDerivationPath && 'opacity-100',
          )}
        >
          {accountUtils.getDerivationPath(account)}
        </FootnoteText>
      </div>
    </InfoPopover>
  );
};
