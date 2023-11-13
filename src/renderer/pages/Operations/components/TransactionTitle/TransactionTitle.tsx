import { PropsWithChildren } from 'react';

import { Icon, BodyText, FootnoteText } from '@shared/ui';
import { useI18n } from '@app/providers';
import { DecodedTransaction, Transaction } from '@entities/transaction';
import { getTransactionTitle } from '../../common/utils';
import { cnTw } from '@shared/lib/utils';
import { getIconName } from '@entities/transaction/lib/transactionIcon';

type Props = {
  tx?: Transaction | DecodedTransaction;
  description?: string;
  className?: string;
};

export const TransactionTitle = ({ tx, description, className, children }: PropsWithChildren<Props>) => {
  const { t } = useI18n();

  const title = getTransactionTitle(tx);

  return (
    <div className={cnTw('inline-flex gap-x-3 items-center', className)}>
      <div className="flex items-center justify-center shrink-0 w-7 h-7 box-content rounded-full border border-token-container-border">
        <Icon name={getIconName(tx)} size={20} />
      </div>
      <div className="flex flex-col gap-y-0.5 justify-center overflow-hidden">
        <div className="flex gap-x-1 items-center">
          <BodyText className={cnTw('whitespace-nowrap', !children && 'truncate')}>{t(title)}</BodyText>
          {children}
        </div>
        {description && <FootnoteText className="text-text-tertiary truncate">{description} </FootnoteText>}
      </div>
    </div>
  );
};
