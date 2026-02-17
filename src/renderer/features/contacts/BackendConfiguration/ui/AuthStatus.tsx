import { useUnit } from 'effector-react';

import { toAddress } from '@/shared/lib/utils';
import { FootnoteText } from '@/shared/ui';
import { Identicon } from '@/shared/ui-entities';
import { authModel } from '../model/auth-model';

export const AuthStatus = () => {
  const [isAuthenticated, authState] = useUnit([authModel.$isAuthenticated, authModel.$authState]);

  if (!isAuthenticated || !authState) {
    return null;
  }

  return (
    <div className="flex items-center gap-x-1">
      <Identicon address={toAddress(authState.accountId)} size={16} background={false} />
      <FootnoteText className="max-w-[80px] truncate">{authState.accountName}</FootnoteText>
    </div>
  );
};
