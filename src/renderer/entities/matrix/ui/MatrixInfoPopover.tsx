import { Trans } from 'react-i18next';

import { useI18n } from '@app/providers';

import { FootnoteText, InfoLink, LabelHelpBox, Popover, SmallTitleText } from '@shared/ui';

const MATRIX = 'https://matrix.org/';
const SMP = 'https://docs.novaspektr.io/multisig-accounts/spektr-matrix-protocol';

export const MatrixInfoPopover = () => {
  const { t } = useI18n();

  const matrix = <InfoLink url={MATRIX} className="text-footnote text-tab-text-accent" />;
  const smp = <InfoLink url={SMP} className="text-footnote text-tab-text-accent" />;

  return (
    <Popover
      offsetPx={4}
      contentClass="p-4"
      panelClass="w-[360px]"
      content={
        <div className="flex flex-col gap-y-4">
          <section className="flex flex-col gap-y-2">
            <SmallTitleText>{t('settings.matrix.infoWhyMatrixTitle')}</SmallTitleText>
            <FootnoteText className="text-text-secondary">{t('settings.matrix.infoSpektrDescription')}</FootnoteText>
          </section>

          <section className="flex flex-col gap-y-2">
            <SmallTitleText>{t('settings.matrix.infoWhatIsMatrixTitle')}</SmallTitleText>
            <FootnoteText className="text-text-secondary">
              <Trans t={t} i18nKey="settings.matrix.infoMatrixDescription" components={{ matrix, smp }} />
              <ol className="list-decimal ml-4">
                <li>{t('settings.matrix.infoMatrixDescriptionOne')}</li>
                <li>{t('settings.matrix.infoMatrixDescriptionTwo')}</li>
              </ol>
              {t('settings.matrix.infoSpektrDescription')}
            </FootnoteText>
          </section>
        </div>
      }
    >
      {/* TODO remove mt-4 when base modal padding is changed */}
      <LabelHelpBox className="mt-4 mb-6">{t('settings.matrix.tooltipLabel')}</LabelHelpBox>
    </Popover>
  );
};
