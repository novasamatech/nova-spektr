import { FootnoteText, Icon, Popover, SmallTitleText } from '@renderer/shared/ui';
import { useI18n } from '@renderer/app/providers';

export const VaultInfoPopover = () => {
  const { t } = useI18n();

  return (
    <Popover
      offsetPx={4}
      contentClass="p-4"
      panelClass="w-[360px]"
      wrapperClass="w-max"
      content={
        <div className="flex flex-col gap-y-4">
          <section className="flex flex-col gap-y-2">
            <SmallTitleText>{t('onboarding.vault.info.vaultTitle')}</SmallTitleText>
          </section>

          <section className="flex flex-col gap-y-2">
            <FootnoteText className="text-text-secondary">{t('onboarding.vault.info.vaultDescription')}</FootnoteText>
          </section>

          <section className="flex flex-col gap-y-2">
            <SmallTitleText>{t('onboarding.vault.info.accountsTitle')}</SmallTitleText>
          </section>

          <section className="flex flex-col gap-y-2">
            <FootnoteText className="text-text-secondary">
              {t('onboarding.vault.info.accountsDescription')}
            </FootnoteText>
          </section>
        </div>
      }
    >
      <Icon name="questionOutline" size={16} />
    </Popover>
  );
};
