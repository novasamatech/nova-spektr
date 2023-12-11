import { Trans } from 'react-i18next';

import { FootnoteText, InfoLink, LabelHelpBox, Popover, SmallTitleText } from '@shared/ui';
import { useI18n } from '@app/providers';

const MATRIX = 'https://matrix.org/';
const SMP = 'https://docs.novaspektr.io/multisig-accounts/spektr-matrix-protocol';

const sectionClass = 'flex flex-col gap-y-2';
const linkClass = 'text-footnote text-tab-text-accent';

export const MatrixInfoPopover = () => {
  const { t } = useI18n();

  const matrix = <InfoLink url={MATRIX} className={linkClass} />;
  const smp = <InfoLink url={SMP} className={linkClass} />;

  return (
    <Popover
      contentClass="p-4"
      offsetPx={4}
      content={
        <div className="flex flex-col gap-y-4">
          <section className={sectionClass}>
            <SmallTitleText>{t('settings.matrix.infoWhyMatrixTitle')}</SmallTitleText>
            <FootnoteText className="text-text-secondary">{t('settings.matrix.infoSpektrDescription')}</FootnoteText>
          </section>

          <section className={sectionClass}>
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
      {/* TODO remove mt-4 when base modal props changed */}
      <LabelHelpBox className="mt-4 mb-6">{t('settings.matrix.tooltipLabel')}</LabelHelpBox>
    </Popover>
  );
};
