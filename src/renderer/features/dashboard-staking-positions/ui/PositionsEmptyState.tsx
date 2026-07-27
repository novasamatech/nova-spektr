import { useI18n } from '@/shared/i18n';
import { BodyText, Button, Icon, InfoLink, SmallTitleText } from '@/shared/ui';
import { Tooltip } from '@/shared/ui-kit';

/**
 * Docs root rather than a deep link: no staking page is referenced anywhere in
 * the app yet, and a guessed path that 404s is worse than one extra click.
 */
const STAKING_DOCS_URL = 'https://docs.novaspektr.io/';

type Props = {
  startStakingWired: boolean;
  onStartStaking: () => void;
};

export const PositionsEmptyState = ({ startStakingWired, onStartStaking }: Props) => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center gap-y-3 px-4 py-10">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-label-purple-default">
        <Icon name="staking" size={28} className="text-icon-alert" />
      </div>

      <SmallTitleText>{t('dashboard.staking.positions.empty.title')}</SmallTitleText>

      <BodyText className="max-w-100 text-center text-text-tertiary">
        {t('dashboard.staking.positions.empty.description')}
      </BodyText>

      <div className="mt-1 flex flex-col items-center gap-y-2">
        <Tooltip open={startStakingWired ? false : undefined}>
          <Tooltip.Trigger>
            <div>
              <Button size="sm" disabled={!startStakingWired} onClick={onStartStaking}>
                {t('dashboard.staking.positions.empty.action')}
              </Button>
            </div>
          </Tooltip.Trigger>
          <Tooltip.Content>{t('dashboard.staking.positions.detail.actions.notWired')}</Tooltip.Content>
        </Tooltip>

        <InfoLink url={STAKING_DOCS_URL} withLinkIcon>
          {t('dashboard.staking.positions.empty.learnMore')}
        </InfoLink>
      </div>
    </div>
  );
};
