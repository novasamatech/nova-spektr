import { useI18n } from '@app/providers';

import { cnTw } from '@shared/lib/utils';
import { Button, FootnoteText, Icon, SmallTitleText } from '@shared/ui';

import { ProxyPopover } from '@entities/proxy';

type Props = {
  canCreateProxy?: boolean;
  className?: string;
  onAddProxy: () => void;
};

export const NoProxiesAction = ({ className, canCreateProxy = true, onAddProxy }: Props) => {
  const { t } = useI18n();

  return (
    <div className={cnTw('flex flex-col items-center justify-center h-[376px]', className)}>
      <Icon name="document" size={64} />
      <div className="flex items-center gap-x-1.5 mt-6 mb-2">
        <SmallTitleText>{t('walletDetails.common.emptyProxyTitle')}</SmallTitleText>
        <ProxyPopover />
      </div>
      {canCreateProxy && (
        <>
          <FootnoteText className="text-text-tertiary mb-4">
            {t('walletDetails.common.emptyProxyDescription')}
          </FootnoteText>
          <Button size="sm" onClick={onAddProxy}>
            {t('walletDetails.common.addProxyButton')}
          </Button>
        </>
      )}
    </div>
  );
};
