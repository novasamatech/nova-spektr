import { Icon } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { Transaction } from '@renderer/domain/transaction';
import { getIconName, getTransactionTitle } from '../../common/utils';
import { BodyText, FootnoteText } from '@renderer/components/ui-redesign';

type Props = {
  tx?: Transaction;
  description?: string;
  withoutIcon?: boolean;
};

const TransactionTitle = ({ tx, description, withoutIcon }: Props) => {
  const { t } = useI18n();

  const iconName = getIconName(tx);
  const transactionTitle = getTransactionTitle(tx);

  return (
    <div className="inline-flex gap-x-2 items-center max-w-full">
      {!withoutIcon && (
        <div className="flex items-center justify-center w-7 h-7 box-content rounded-full border border-token-container-border ml-2">
          <Icon className="text-icon-default" name={iconName} size={16} />
        </div>
      )}
      <div className="flex flex-col gap-0.5 justify-center max-w-[150px] pr-2">
        <BodyText>{t(transactionTitle)}</BodyText>
        {description && <FootnoteText className="text-text-tertiary truncate">{description} </FootnoteText>}
      </div>
    </div>
  );
};

export default TransactionTitle;
