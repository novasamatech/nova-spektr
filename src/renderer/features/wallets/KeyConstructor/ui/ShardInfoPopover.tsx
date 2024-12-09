import { useI18n } from '@/shared/i18n';
import { FootnoteText, IconButton, InfoLink } from '@/shared/ui';
import { Box, Popover } from '@/shared/ui-kit';

export const ShardInfoPopover = () => {
  const { t } = useI18n();

  return (
    <Popover>
      <Popover.Trigger>
        <IconButton name="info" size={16} />
      </Popover.Trigger>
      <Popover.Content>
        <Box direction="column" gap={4} padding={4} width="360px">
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
        </Box>
      </Popover.Content>
    </Popover>
  );
};
