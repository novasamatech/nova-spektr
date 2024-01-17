import { Trans } from 'react-i18next';

import { FootnoteText, Icon, Popover, SmallTitleText } from '@shared/ui';
import { useI18n } from '@app/providers';

// const WIKI_LINK = '';

export const ProxyPopover = () => {
  const { t } = useI18n();

  // TODO add link when proxy wiki is ready
  // const infoLink = <InfoLink url={WIKI_LINK} className="text-footnote text-tab-text-accent" />;

  return (
    <Popover
      contentClass="p-4 w-[360px]"
      panelClass="left-[-180px] bottom-full mb-1"
      content={
        <div className="flex flex-col gap-y-4">
          <section className="flex flex-col gap-y-2">
            <SmallTitleText>{t('walletDetails.common.proxyTooltipWhatIsProxyTitle')}</SmallTitleText>
            <FootnoteText className="text-text-secondary">
              <Trans t={t} i18nKey="walletDetails.common.proxyTooltipWhatIsProxy" />
            </FootnoteText>
          </section>

          <section className="flex flex-col gap-y-2">
            <SmallTitleText>{t('walletDetails.common.proxyTooltipWhyProxyTitle')}</SmallTitleText>
            <FootnoteText className="text-text-secondary">
              {t('walletDetails.common.proxyTooltipWhyProxy')}
            </FootnoteText>
          </section>
        </div>
      }
    >
      <Icon name="questionOutline" className="hover:text-icon-hover active:text-icon-active" size={16} />
    </Popover>
  );
};
