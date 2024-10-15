import { type ReferendumId } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { BlockExplorer } from '@/shared/ui';

type Props = {
  referendumId: ReferendumId;
  network: string;
};

export const ReferendumAdditional = ({ network, referendumId }: Props) => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-3">
      <BlockExplorer icon="polkassembly" href={t('governance.additional.polkassemblyLink', { network, referendumId })}>
        {t('governance.additional.polkassemblyLinkTitle')}
      </BlockExplorer>
      <BlockExplorer icon="subsquare" href={t('governance.additional.subsquareLink', { network, referendumId })}>
        {t('governance.additional.subsquareLinkTitle')}
      </BlockExplorer>
    </div>
  );
};
