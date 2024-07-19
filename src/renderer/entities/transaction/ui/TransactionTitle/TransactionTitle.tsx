import { type PropsWithChildren } from 'react';

import { useI18n } from '@app/providers';
import { type DecodedTransaction, type Transaction } from '@shared/core';
import { cnTw } from '@shared/lib/utils';
import { BodyText, FootnoteText, Icon } from '@shared/ui';
import { getIconName } from '@entities/transaction/lib/transactionIcon';
import { getTransactionTitle } from '../../lib';

type Props = {
  tx?: Transaction | DecodedTransaction;
  description?: string;
  className?: string;
};

export const TransactionTitle = ({ tx, description, className, children }: PropsWithChildren<Props>) => {
  const { t } = useI18n();

  const title = getTransactionTitle(t, tx);

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
