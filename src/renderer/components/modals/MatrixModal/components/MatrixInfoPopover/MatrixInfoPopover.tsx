import { Trans } from 'react-i18next';

import { BodyText, FootnoteText, InfoLink, Popover, SmallTitleText } from '@renderer/components/ui-redesign';
import { useI18n } from '@renderer/context/I18nContext';
import { Icon } from '@renderer/components/ui';

const MATRIX = 'https://matrix.org/';
const SMP = 'https://docs.novaspektr.io/multisig-accounts/spektr-matrix-protocol';

const sectionClass = 'flex flex-col gap-y-2';
const linkClass = 'text-footnote text-tab-text-accent';

const MatrixInfoPopover = () => {
  const { t } = useI18n();

  const matrix = <InfoLink url={MATRIX} showIcon={false} className={linkClass} />;
  const smp = <InfoLink url={SMP} showIcon={false} className={linkClass} />;

  return (
    <Popover
      contentClass="p-4"
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
      <div className="flex gap-x-1 bg-secondary-button-background items-center rounded-md py-0.5 px-2 mt-4 mb-6">
        <BodyText>{t('settings.matrix.tooltipLabel')}</BodyText>
        <Icon name="questionOutline" className="text-icon-default" size={16} />
      </div>
    </Popover>
  );
};

export default MatrixInfoPopover;
