import { Icon } from '@renderer/components/ui';
import { IconNames } from '@renderer/components/ui/Icon/data';
import { useI18n } from '@renderer/context/I18nContext';
import { Transaction, TransactionType } from '@renderer/domain/transaction';
import { getTransactionType } from '../common/utils';

type Props = {
  transaction?: Transaction;
  description?: string;
};

const TransactionTitles: Record<TransactionType, string> = {
  // Transfer
  [TransactionType.ASSET_TRANSFER]: 'operations.titles.transfer',
  [TransactionType.ORML_TRANSFER]: 'operations.titles.transfer',
  [TransactionType.TRANSFER]: 'operations.titles.transfer',
  // Staking
  [TransactionType.BOND]: 'operations.titles.startStaking',
  [TransactionType.NOMINATE]: 'operations.titles.nominate',
  [TransactionType.STAKE_MORE]: 'operations.titles.stakeMore',
  [TransactionType.REDEEM]: 'operations.titles.redeem',
  [TransactionType.RESTAKE]: 'operations.titles.restake',
  [TransactionType.DESTINATION]: 'operations.titles.destination',
  [TransactionType.UNSTAKE]: 'operations.titles.unstake',
  // Technical
  [TransactionType.CHILL]: 'operations.titles.unknown',
  [TransactionType.BATCH_ALL]: 'operations.titles.unknown',
};

const TransactionIcons: Record<TransactionType, IconNames> = {
  // Transfer
  [TransactionType.ASSET_TRANSFER]: 'staking',
  [TransactionType.ORML_TRANSFER]: 'staking',
  [TransactionType.TRANSFER]: 'staking',
  // Staking
  [TransactionType.BOND]: 'staking',
  [TransactionType.NOMINATE]: 'staking',
  [TransactionType.STAKE_MORE]: 'staking',
  [TransactionType.REDEEM]: 'staking',
  [TransactionType.RESTAKE]: 'staking',
  [TransactionType.DESTINATION]: 'staking',
  [TransactionType.UNSTAKE]: 'staking',
  // Technical
  [TransactionType.CHILL]: 'staking',
  [TransactionType.BATCH_ALL]: 'staking',
};

const getTransactionTitle = (transaction?: Transaction): string => {
  const transactionType = getTransactionType(transaction);

  if (!transactionType) return 'operations.titles.unknown';

  return TransactionTitles[transactionType];
};

const getIconName = (transaction?: Transaction): IconNames => {
  const transactionType = getTransactionType(transaction);

  if (!transactionType) return 'question';

  return TransactionIcons[transactionType];
};

const TransactionTitle = ({ transaction, description }: Props) => {
  const { t } = useI18n();

  const iconName = getIconName(transaction);
  const transactionTitle = getTransactionTitle(transaction);

  return (
    <div className="flex gap-2">
      <div className="row-span-2 self-center">
        <Icon className="rounded-full border-solid border bg-shade-2 border-shade-5" name={iconName} />
      </div>
      <div>
        <div className="text-black text-base">{t(transactionTitle)}</div>
        {description && <div className="text-shade-50 text-base">{description} </div>}
      </div>
    </div>
  );
};

export default TransactionTitle;
