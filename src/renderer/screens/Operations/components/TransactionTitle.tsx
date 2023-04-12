import { Icon } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { Transaction } from '@renderer/domain/transaction';
import { getIconName, getTransactionTitle } from '../common/utils';

type Props = {
  tx?: Transaction;
  description?: string;
};

const TransactionTitle = ({ tx, description }: Props) => {
  const { t } = useI18n();

  const iconName = getIconName(tx);
  const transactionTitle = getTransactionTitle(tx);

  return (
    <div className="flex gap-2 ">
      <div className="row-span-2 self-center">
        <Icon className="rounded-full border-solid border bg-shade-2 border-shade-5" name={iconName} />
      </div>
      <div>
        <div className="text-black text-base">{t(transactionTitle)}</div>
        {description && <div className="text-shade-50 text-base truncate">{description} </div>}
      </div>
    </div>
  );
};

export default TransactionTitle;
