import { type PropsWithChildren } from 'react';
import { Trans } from 'react-i18next';

import { useI18n } from '@/shared/i18n';
import { FootnoteText, Icon, LabelHelpBox, SmallTitleText } from '@/shared/ui';
import { Popover } from '@/shared/ui-kit';

// const WIKI_LINK = '';

export const PureProxyPopover = ({ children }: PropsWithChildren) => {
  const { t } = useI18n();

  // TODO add link when proxy wiki is ready
  // const infoLink = <InfoLink url={WIKI_LINK} className="text-footnote text-tab-text-accent" />;

  return (
    <Popover>
      <Popover.Trigger>
        <div>
          {children ? (
            <LabelHelpBox className="mb-6 mt-4">{children}</LabelHelpBox>
          ) : (
            <Icon name="questionOutline" className="hover:text-icon-hover active:text-icon-active" size={16} />
          )}
        </div>
      </Popover.Trigger>
      <Popover.Content>
        <div className="flex w-[360px] flex-col gap-y-4 p-4">
          <section className="flex flex-col gap-y-2">
            <SmallTitleText>{t('proxy.pureProxyTooltip.title1')}</SmallTitleText>
            <FootnoteText className="text-text-secondary">
              <Trans t={t} i18nKey="proxy.pureProxyTooltip.description1" />
            </FootnoteText>
          </section>

          <section className="flex flex-col gap-y-2">
            <SmallTitleText>{t('proxy.pureProxyTooltip.title2')}</SmallTitleText>
            <FootnoteText className="text-text-secondary">
              <Trans t={t} i18nKey="proxy.pureProxyTooltip.description2" components={{ ul: <ul />, li: <li /> }} />
            </FootnoteText>
          </section>
        </div>
      </Popover.Content>
    </Popover>
  );
};
