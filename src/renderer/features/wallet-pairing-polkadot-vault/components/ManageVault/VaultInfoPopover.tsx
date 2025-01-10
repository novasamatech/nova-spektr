import { useI18n } from '@/shared/i18n';
import { FootnoteText, Icon, SmallTitleText } from '@/shared/ui';
import { Popover } from '@/shared/ui-kit';

export const VaultInfoPopover = () => {
  const { t } = useI18n();

  return (
    <Popover>
      <Popover.Trigger>
        <div>
          <Icon name="questionOutline" size={16} />
        </div>
      </Popover.Trigger>
      <Popover.Content>
        <div className="flex w-[360px] flex-col gap-y-4 p-4">
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
      </Popover.Content>
    </Popover>
  );
};
