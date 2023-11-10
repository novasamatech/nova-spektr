import { FootnoteText, Icon, Popover, SmallTitleText } from '@renderer/shared/ui';
import { useI18n } from '@renderer/app/providers';

const sectionClass = 'flex flex-col gap-y-2';

export const VaultInfoPopover = () => {
  const { t } = useI18n();

  return (
    <Popover
      contentClass="p-4"
      offsetPx={4}
      content={
        <div className="flex flex-col gap-y-4">
          <section className={sectionClass}>
            <SmallTitleText>{t('onboarding.vault.info.vaultTitle')}</SmallTitleText>
          </section>

          <section className={sectionClass}>
            <FootnoteText className="text-text-secondary">{t('onboarding.vault.info.vaultDescription')}</FootnoteText>
          </section>

          <section className={sectionClass}>
            <SmallTitleText>{t('onboarding.vault.info.accountsTitle')}</SmallTitleText>
          </section>

          <section className={sectionClass}>
            <FootnoteText className="text-text-secondary">
              {t('onboarding.vault.info.accountsDescription')}
            </FootnoteText>
          </section>
        </div>
      }
    >
      <Icon name="questionOutline" />
    </Popover>
  );
};
