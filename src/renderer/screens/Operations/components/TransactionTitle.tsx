import { Icon } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { Transaction } from '@renderer/domain/transaction';
import { getIconName, getTransactionTitle } from '../common/utils';
import { BodyText, FootnoteText } from '@renderer/components/ui-redesign';

type Props = {
  tx?: Transaction;
  description?: string;
};

const TransactionTitle = ({ tx, description }: Props) => {
  const { t } = useI18n();

  const iconName = getIconName(tx);
  const transactionTitle = getTransactionTitle(tx);

  return (
    <div className="'flex inline-flex gap-2 items-center'">
      <Icon
        className="p-1.5 box-content rounded-full border border-token-container-border text-icon-default"
        name={iconName}
        size={16}
      />
      <div className="flex flex-col gap-0.5 justify-center">
        <BodyText>{t(transactionTitle)}</BodyText>
        {description && <FootnoteText className="text-text-tertiary truncate">{description} </FootnoteText>}
      </div>
    </div>
  );
};

export default TransactionTitle;
