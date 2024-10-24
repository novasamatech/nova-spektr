import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { Button, FootnoteText, Icon, SmallTitleText } from '@/shared/ui';
import { ProxyPopover } from '@/entities/proxy';

type Props = {
  canCreateProxy?: boolean;
  className?: string;
  onAddProxy: () => void;
};

export const NoProxiesAction = ({ className, canCreateProxy = true, onAddProxy }: Props) => {
  const { t } = useI18n();

  return (
    <div className={cnTw('flex h-[376px] flex-col items-center justify-center', className)}>
      <Icon name="document" size={64} />
      <div className="mb-2 mt-6 flex items-center gap-x-1.5">
        <SmallTitleText>{t('walletDetails.common.emptyProxyTitle')}</SmallTitleText>
        <ProxyPopover />
      </div>
      {canCreateProxy && (
        <>
          <FootnoteText className="mb-4 text-text-tertiary">
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
