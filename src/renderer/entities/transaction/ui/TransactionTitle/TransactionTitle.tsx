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
    <div className={cnTw('inline-flex items-center gap-x-3', className)}>
      <div className="box-content flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-token-container-border">
        <Icon name={getIconName(tx)} size={20} />
      </div>
      <div className="flex flex-col justify-center gap-y-0.5 overflow-hidden">
        <div className="flex items-center gap-x-1">
          <BodyText className={cnTw('whitespace-nowrap', !children && 'truncate')}>{t(title)}</BodyText>
          {children}
        </div>
        {description && <FootnoteText className="truncate text-text-tertiary">{description} </FootnoteText>}
      </div>
    </div>
  );
};
