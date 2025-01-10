import { type PropsWithChildren } from 'react';
import { Trans } from 'react-i18next';

import { useI18n } from '@/shared/i18n';
import { FootnoteText, IconButton, LabelHelpBox, SmallTitleText } from '@/shared/ui';
import { Popover } from '@/shared/ui-kit';

// const WIKI_LINK = '';

export const ProxyPopover = ({ children }: PropsWithChildren) => {
  const { t } = useI18n();

  // TODO add link when proxy wiki is ready
  // const infoLink = <InfoLink url={WIKI_LINK} className="text-footnote text-tab-text-accent" />;

  return (
    <Popover>
      <Popover.Trigger>
        <div className="h-4">
          {children ? (
            <LabelHelpBox className="mb-6 mt-4">{children}</LabelHelpBox>
          ) : (
            <IconButton name="questionOutline" className="hover:text-icon-hover active:text-icon-active" size={16} />
          )}
        </div>
      </Popover.Trigger>
      <Popover.Content>
        <div className="flex w-[360px] flex-col gap-y-4 p-4">
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
      </Popover.Content>
    </Popover>
  );
};
