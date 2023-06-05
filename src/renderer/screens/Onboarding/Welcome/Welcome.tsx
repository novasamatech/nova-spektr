import { useNavigate } from 'react-router-dom';

import { Icon } from '@renderer/components/ui';
import { BodyText, FootnoteText, TitleText, CaptionText } from '@renderer/components/ui-redesign';
import { useI18n } from '@renderer/context/I18nContext';
import { useToggle } from '@renderer/shared/hooks';
import cnTw from '@renderer/shared/utils/twMerge';
import WatchOnly from '../WatchOnly/WatchOnly';
import Paths from '@renderer/routes/paths';
import Vault from '../Vault/Vault';
import PrivacyPolicy from './PrivacyPolicy';

const Welcome = () => {
  const { t } = useI18n();
  const navigate = useNavigate();

  const [isWatchOnlyModalOpen, toggleWatchOnlyModal] = useToggle(false);
  const [isVaultModalOpen, toggleVaultModal] = useToggle(false);

  const handleCreateWatchOnlyWallet = () => {
    toggleWatchOnlyModal();
    navigate(Paths.BALANCES);
  };

  const handleCreateVaultWallet = () => {
    toggleVaultModal();
    navigate(Paths.BALANCES);
  };

  return (
    <div className="flex h-screen w-screen">
      <div className="w-[512px] flex flex-col p-10 h-full">
        <TitleText className="mb-8">{t('onboarding.welcome.title')}</TitleText>

        <div className="flex flex-col gap-4">
          <button
            className={cnTw(
              'flex items-center gap-4 px-4 py-2',
              'bg-block-background-default hover:bg-block-background-hover border-filter-border border',
              'shadow-card-shadow',
            )}
            onClick={toggleVaultModal}
          >
            <Icon className="bg-icon-active p-2 text-icon-button rounded-xl" size={40} name="vault" />
            <div className="flex-1">
              <div className="flex justify-between items-center w-full">
                <BodyText className="text-text-primary">{t('onboarding.welcome.polkadotVaultTitle')}</BodyText>
                <Icon className="text-text-tertiary" name="arrowRight" size={24} />
              </div>
              <FootnoteText className="text-text-tertiary">
                {t('onboarding.welcome.polkadotVaultDescription')}
              </FootnoteText>
            </div>
          </button>

          <button
            className={cnTw(
              'flex items-center gap-4 px-4 py-2',
              'bg-block-background-default hover:bg-block-background-hover border-filter-border border',
              'shadow-card-shadow',
            )}
            onClick={toggleWatchOnlyModal}
          >
            <Icon className="bg-icon-active text-icon-button rounded-xl" size={40} name="watchOnlyBg" />
            <div className="flex-1">
              <div className="flex justify-between items-center w-full">
                <BodyText className="text-text-primary">{t('onboarding.welcome.watchOnlyTitle')}</BodyText>
                <Icon className="text-text-tertiary" name="arrowRight" size={24} />
              </div>
              <FootnoteText className="text-text-tertiary">{t('onboarding.welcome.watchOnlyDescription')}</FootnoteText>
            </div>
          </button>

          <button
            disabled
            className={cnTw(
              'flex items-center gap-4 px-4 py-2',
              'bg-input-background-disabled border-filter-border border',
              'shadow-card-shadow',
            )}
            onClick={toggleWatchOnlyModal}
          >
            <Icon className="bg-tab-icon-inactive p-2 text-icon-button rounded-xl" size={40} name="novaWallet" />
            <div className="flex-1">
              <div className="flex justify-between items-center w-full">
                <BodyText className="text-text-tertiary">{t('onboarding.welcome.novaWalletTitle')}</BodyText>
                <CaptionText
                  className="text-button-text uppercase bg-label-background-gray px-2 py-1 rounded-full"
                  data-testid="progress"
                >
                  {t('onboarding.welcome.soonBadge')}
                </CaptionText>
              </div>
              <FootnoteText className="text-text-tertiary">
                {t('onboarding.welcome.novaWalletDescription')}
              </FootnoteText>
            </div>
          </button>
        </div>

        <div className="flex-1 flex items-end">
          <PrivacyPolicy />
        </div>
      </div>
      <div className="flex-1 flex flex-col h-full bg-input-background-disabled p-10"></div>

      <WatchOnly
        isOpen={isWatchOnlyModalOpen}
        onClose={toggleWatchOnlyModal}
        onComplete={handleCreateWatchOnlyWallet}
      />

      <Vault isOpen={isVaultModalOpen} onClose={toggleVaultModal} onComplete={handleCreateVaultWallet} />
    </div>
  );
};

export default Welcome;
