import { Icon, BodyText, FootnoteText } from '@renderer/shared/ui';
import { useI18n } from '@renderer/app/providers';
import { DecodedTransaction, Transaction } from '@renderer/entities/transaction';
import { getIconName, getTransactionTitle } from '../../common/utils';
import { cnTw } from '@renderer/shared/lib/utils';

type Props = {
  tx?: Transaction | DecodedTransaction;
  description?: string;
  withoutIcon?: boolean;
  className?: string;
};

const TransactionTitle = ({ tx, description, withoutIcon, className }: Props) => {
  const { t } = useI18n();

  const iconName = getIconName(tx);
  const transactionTitle = getTransactionTitle(tx);

  return (
    <div className={cnTw('inline-flex gap-x-3 items-center max-w-full', className)}>
      {!withoutIcon && (
        <div className="flex items-center justify-center w-7 h-7 box-content rounded-full border border-token-container-border">
          <Icon name={iconName} size={20} />
        </div>
      )}
      <div className="flex flex-col gap-0.5 justify-center max-w-[126px]">
        <BodyText className="whitespace-nowrap truncate">{t(transactionTitle)}</BodyText>
        {description && <FootnoteText className="text-text-tertiary truncate">{description} </FootnoteText>}
      </div>
    </div>
  );
};

export default TransactionTitle;
