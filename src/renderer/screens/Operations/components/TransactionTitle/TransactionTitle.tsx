import { Icon } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { Transaction } from '@renderer/domain/transaction';
import { getIconName, getTransactionTitle } from '../../common/utils';
import { BodyText, FootnoteText } from '@renderer/components/ui-redesign';
import cnTw from '@renderer/shared/utils/twMerge';

type Props = {
  tx?: Transaction;
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
          <Icon name={iconName} size={16} />
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
