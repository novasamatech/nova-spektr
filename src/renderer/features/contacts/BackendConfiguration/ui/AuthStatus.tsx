import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { toAddress } from '@/shared/lib/utils';
import { FootnoteText, Icon } from '@/shared/ui';
import { Identicon } from '@/shared/ui-entities';
import { authModel } from '../model/auth-model';

export const AuthStatus = () => {
  const { t } = useI18n();
  const [isAuthenticated, authState, isSessionExpired] = useUnit([
    authModel.$isAuthenticated,
    authModel.$authState,
    authModel.$isSessionExpired,
  ]);

  if (isSessionExpired) {
    return (
      <div className="flex items-center gap-x-1">
        <Icon name="warnCutout" size={14} className="text-text-warning" />
        <FootnoteText className="text-text-warning">{t('addressBook.auth.sessionExpired')}</FootnoteText>
      </div>
    );
  }

  if (!isAuthenticated || !authState) {
    return <FootnoteText className="text-text-tertiary">{t('addressBook.auth.disconnected')}</FootnoteText>;
  }

  return (
    <div className="flex items-center gap-x-1">
      <Identicon address={toAddress(authState.accountId)} size={16} background={false} />
      <FootnoteText className="max-w-[80px] truncate">{authState.accountName}</FootnoteText>
    </div>
  );
};
