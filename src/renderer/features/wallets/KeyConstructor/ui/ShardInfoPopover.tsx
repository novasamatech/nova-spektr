import { FootnoteText, Icon, Popover, InfoLink } from '@shared/ui';
import { useI18n } from '@app/providers';

export const ShardInfoPopover = () => {
  const { t } = useI18n();

  return (
    <Popover
      contentClass="p-4"
      offsetPx={4}
      panelClass="w-[360px] left-1/2 -translate-x-1/2"
      content={
        <div className="flex flex-col gap-y-4">
          <section className="flex flex-col gap-y-2">
            <FootnoteText className="text-text-secondary">
              {t('dynamicDerivations.constructor.shardInfoOne')}
            </FootnoteText>
          </section>
          <section className="flex flex-col gap-y-2">
            <FootnoteText className="text-text-secondary">
              {t('dynamicDerivations.constructor.shardInfoTwo')}
            </FootnoteText>
          </section>

          <section className="flex flex-col gap-y-2">
            <InfoLink
              url="https://docs.novaspektr.io/staking/multishard-relay-chain-nominating"
              iconName="link"
              iconPosition="right"
            >
              {t('dynamicDerivations.constructor.shardInfoLink')}
            </InfoLink>
          </section>
        </div>
      }
    >
      <Icon name="info" size={16} />
    </Popover>
  );
};
