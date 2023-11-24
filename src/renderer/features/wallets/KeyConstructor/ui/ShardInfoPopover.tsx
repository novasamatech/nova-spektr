import { FootnoteText, Icon, Popover, InfoLink } from '@shared/ui';
// import { useI18n } from '@renderer/app/providers';

export const ShardInfoPopover = () => {
  // const { t } = useI18n();

  return (
    <Popover
      contentClass="p-4"
      offsetPx={4}
      panelClass="w-[360px]"
      content={
        <div className="flex flex-col gap-y-4">
          <section className="flex flex-col gap-y-2">
            <FootnoteText className="text-text-secondary">
              Sharding creates a set of different keys (shards) that are independent from each other but associated with
              each other in the Nova Spektr application for some operations.
            </FootnoteText>
          </section>
          <section className="flex flex-col gap-y-2">
            <FootnoteText className="text-text-secondary">
              A sharded account consists of multiple keys (shards) numbered from 0 to the total number of shards minus
              1. Each shard is created with a hard derivation path (//0, //1, //2, ..., //N-1).
            </FootnoteText>
          </section>

          <section className="flex flex-col gap-y-2">
            <InfoLink url="https://google.com" iconName="link" iconPosition="right">
              Multishard operations wiki
            </InfoLink>
          </section>
        </div>
      }
    >
      <Icon name="info" size={16} />
    </Popover>
  );
};
