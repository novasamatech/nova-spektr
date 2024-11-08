import { useI18n } from '@/shared/i18n';
import { FootnoteText, Icon, Popover } from '@/shared/ui';

export const ProxiedTooltip = () => {
  const { t } = useI18n();

  return (
    <Popover
      offsetPx={4}
      contentClass="p-4"
      panelClass="w-[360px]"
      wrapperClass="w-max"
      content={
        <div className="flex flex-col gap-y-4">
          <FootnoteText className="text-text-secondary">{t('proxy.tooltipPart1')}</FootnoteText>
          <FootnoteText className="text-text-secondary">{t('proxy.tooltipPart2')}</FootnoteText>
        </div>
      }
    >
      <Icon name="questionOutline" className="hover:text-icon-hover active:text-icon-active" size={14} />
    </Popover>
  );
};
