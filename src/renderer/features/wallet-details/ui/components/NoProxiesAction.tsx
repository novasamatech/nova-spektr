import { type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { Button, FootnoteText, Icon, SmallTitleText } from '@/shared/ui';
import { ProxyPopover } from '@/entities/proxy';
import { AddProxy } from '@/features/proxy-add';

type Props = {
  canCreateProxy?: boolean;
  className?: string;
  wallet: Wallet;
};

export const NoProxiesAction = ({ className, canCreateProxy = true, wallet }: Props) => {
  const { t } = useI18n();

  return (
    <div className={cnTw('flex h-full flex-col items-center justify-center py-4', className)}>
      <Icon name="document" size={64} />
      <div className="mt-6 mb-2 flex items-center gap-x-1.5">
        <SmallTitleText>{t('walletDetails.common.emptyProxyTitle')}</SmallTitleText>
        <ProxyPopover />
      </div>
      {canCreateProxy && (
        <>
          <FootnoteText className="mb-4 text-text-tertiary">
            {t('walletDetails.common.emptyProxyDescription')}
          </FootnoteText>
          <AddProxy wallet={wallet}>
            <Button size="sm">{t('walletDetails.common.addProxyButton')}</Button>
          </AddProxy>
        </>
      )}
    </div>
  );
};
