import { useI18n } from '@/shared/i18n';
import { CaptionText, Icon } from '@/shared/ui';
import { ChainIcon } from '@/shared/ui-entities';
import { Tooltip } from '@/shared/ui-kit';
import { NamedAccount } from '@/widgets/NameResolver';
import { type PositionRow } from '../lib';

type Props = {
  row: PositionRow;
};

const CHIP_CLASS =
  'flex h-4.5 shrink-0 items-center gap-x-1 rounded-full bg-input-background-disabled px-1.5 text-text-secondary';

/**
 * Identity of a position: who, where, and everything about the account that
 * changes what the user can do with it — the multisig threshold and the drafts
 * already waiting on this very account and chain.
 */
export const PositionAccountCell = ({ row }: Props) => {
  const { t } = useI18n();
  const { accountId, chain, wallet, multisig, draftCount } = row;

  return (
    <div className="flex min-w-0 items-center gap-x-2">
      <div className="min-w-0">
        <NamedAccount accountId={accountId} chain={chain} wallet={wallet} variant="short" iconSize={24} />
      </div>

      <div className="h-[13px] w-[13px] shrink-0">
        <ChainIcon chain={chain} size={13} />
      </div>

      {row.position.kind === 'validator' ? (
        <Tooltip>
          <Tooltip.Trigger>
            <div className={CHIP_CLASS}>
              <CaptionText className="text-text-secondary">
                {t('dashboard.staking.positions.validatorChip')}
              </CaptionText>
            </div>
          </Tooltip.Trigger>
          <Tooltip.Content>{t('dashboard.staking.positions.validatorHint')}</Tooltip.Content>
        </Tooltip>
      ) : null}

      {multisig ? (
        <Tooltip>
          <Tooltip.Trigger>
            <div className={CHIP_CLASS}>
              <CaptionText className="text-text-secondary">
                {t('dashboard.staking.positions.multisigChip', {
                  threshold: multisig.threshold,
                  total: multisig.signatories,
                })}
              </CaptionText>
            </div>
          </Tooltip.Trigger>
          <Tooltip.Content>
            {t('dashboard.staking.positions.multisigHint', {
              threshold: multisig.threshold,
              total: multisig.signatories,
            })}
          </Tooltip.Content>
        </Tooltip>
      ) : null}

      {draftCount > 0 ? (
        <Tooltip>
          <Tooltip.Trigger>
            <div className={CHIP_CLASS}>
              <Icon name="edit" size={10} className="text-text-secondary" />
              <CaptionText className="text-text-secondary">{draftCount}</CaptionText>
            </div>
          </Tooltip.Trigger>
          <Tooltip.Content>{t('dashboard.staking.positions.draftHint', { count: draftCount })}</Tooltip.Content>
        </Tooltip>
      ) : null}
    </div>
  );
};
