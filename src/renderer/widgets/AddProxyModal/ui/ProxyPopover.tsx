import { FootnoteText, Icon, Popover, SmallTitleText } from '@shared/ui';

// const WIKI_LINK = '';

export const ProxyPopover = () => {
  // TODO: add link when proxy wiki is ready
  // const infoLink = <InfoLink url={WIKI_LINK} className="text-footnote text-tab-text-accent" />;

  return (
    <Popover
      contentClass="p-4 w-[360px]"
      panelClass="left-[-180px] bottom-full mb-1"
      content={
        <div className="flex flex-col gap-y-4">
          <section className="flex flex-col gap-y-2">
            <SmallTitleText>Title_1</SmallTitleText>
            {/*<SmallTitleText>{t('walletDetails.common.proxyTooltipTitle1')}</SmallTitleText>*/}
            <FootnoteText className="text-text-secondary">
              Text_1
              {/*<Trans t={t} i18nKey="walletDetails.common.proxyTooltipDesc1" />*/}
            </FootnoteText>
          </section>

          <section className="flex flex-col gap-y-2">
            <SmallTitleText>Title_2</SmallTitleText>
            {/*<SmallTitleText>{t('walletDetails.common.proxyTooltipTitle2')}</SmallTitleText>*/}
            <FootnoteText className="text-text-secondary">Text_2</FootnoteText>
            {/*<FootnoteText className="text-text-secondary">{t('walletDetails.common.proxyTooltipDesc2')}</FootnoteText>*/}
          </section>
        </div>
      }
    >
      {/*Delegated authorities (proxies)*/}
      <Icon name="questionOutline" className="hover:text-icon-hover active:text-icon-active" size={16} />
    </Popover>
  );
};
