import { BodyText, FootnoteText, Icon, InfoPopover } from '@renderer/shared/ui';
import { cnTw } from '@renderer/shared/lib/utils';
import { IconNames } from '@renderer/shared/ui/Icon/data';
import { KeyType } from '@renderer/shared/core';
import { useI18n } from '@renderer/app/providers';
import { useDerivedInfo } from '../../lib/useDerivedInfo';
import { ShardedKeyType } from '@renderer/shared/core/types/account';

const KeyIcon: Record<KeyType, IconNames> = {
  [KeyType.CUSTOM]: 'keyCustom',
  [KeyType.GOVERNANCE]: 'keyGovernance',
  [KeyType.HOT]: 'keyHot',
  [KeyType.MAIN]: 'keyMain',
  [KeyType.PUBLIC]: 'keyPublic',
  [KeyType.STAKING]: 'keyStaking',
};

const KeyTitle: Record<KeyType, string> = {
  [KeyType.CUSTOM]: 'derivedAccount.customTitle',
  [KeyType.GOVERNANCE]: 'derivedAccount.governanceTitle',
  [KeyType.HOT]: 'derivedAccount.hotTitle',
  [KeyType.MAIN]: 'derivedAccount.mainTitle',
  [KeyType.PUBLIC]: 'derivedAccount.publicTitle',
  [KeyType.STAKING]: 'derivedAccount.stakingTitle',
};

const KeyShardedTitle: Record<ShardedKeyType, string> = {
  [KeyType.CUSTOM]: 'derivedAccount.customShardedTitle',
  [KeyType.GOVERNANCE]: 'derivedAccount.governanceShardedTitle',
  [KeyType.MAIN]: 'derivedAccount.mainShardedTitle',
  [KeyType.STAKING]: 'derivedAccount.stakingShardedTitle',
};

type Props = {
  derivationPath?: string;
  keyType: KeyType;
  shards?: number;
  showDerivationPath?: boolean;
  iconSize?: number;
  className?: string;
};

export const DerivedAccount = ({
  keyType,
  shards,
  derivationPath,
  showDerivationPath,
  className,
  iconSize = 30,
}: Props) => {
  const { t } = useI18n();

  const name =
    shards && shards > 0 && KeyShardedTitle[keyType as ShardedKeyType]
      ? KeyShardedTitle[keyType as ShardedKeyType]
      : KeyTitle[keyType];

  const popoverItems = useDerivedInfo({ derivationPath: derivationPath || '' });

  const BodyComponent = (
    <div
      className={cnTw(
        'flex items-center w-full gap-x-2 px-2 h-8 cursor-pointer text-text-secondary',
        'group hover:bg-action-background-hover hover:text-text-primary rounded',
        className,
      )}
    >
      <Icon size={iconSize} name={KeyIcon[keyType]} className="shrink-0 text-text-secondary" />

      <BodyText className="text-text-secondary">{t(name)}</BodyText>
      {showDerivationPath && (
        <FootnoteText className="flex-1 text-text-tertiary" align="right">
          {derivationPath}
        </FootnoteText>
      )}
    </div>
  );

  return derivationPath ? (
    <InfoPopover
      data={popoverItems}
      position="right-0 top-full"
      className="w-[230px]"
      buttonClassName="w-full"
      containerClassName="w-full"
    >
      {BodyComponent}
    </InfoPopover>
  ) : (
    BodyComponent
  );
};
