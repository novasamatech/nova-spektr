import { ButtonLink, Icon } from '@renderer/components/ui';
import Paths from '@renderer/routes/paths';
import LedgerBg from '@images/misc/onboarding/ledger-bg.webp';
import LedgerImg from '@images/misc/onboarding/ledger.svg';
import ParityBg from '@images/misc/onboarding/parity-bg.webp';
import ParitySignerImg from '@images/misc/onboarding/parity-signer.svg';
import WatchBg from '@images/misc/onboarding/watch-bg.webp';
import WatchOnlyImg from '@images/misc/onboarding/watch-only.svg';
import { useI18n } from '@renderer/context/I18nContext';

const Welcome = () => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col h-full">
      <h1 className="flex flex-col text-center mt-7">
        <span className="text-4xl text-neutral">{t('welcome.welcomeToLabel')}</span>
        <span className="font-bold text-[44px] text-primary">{t('welcome.omniEnterpriseLabel')}</span>
      </h1>

      <ul className="flex items-center gap-x-9 m-auto p-5 bg-shade-2 rounded-2lg">
        <li
          aria-label={t('welcome.addWatchOnlyAreaLabel')}
          role="listitem"
          style={{ background: `white url(${WatchBg}) no-repeat 20px 25%` }}
          className="flex flex-col items-center gap-y-5 border-2 border-transparent rounded-2lg p-5 shadow-element text-center focus:shadow-surface hover:shadow-surface focus-within:border-primary hover:border-primary focus-within:scale-105 hover:scale-105 ease-in transition-all"
        >
          <img src={WatchOnlyImg} alt={t('welcome.addWatchOnlyAlt')} width={132} height={56} />
          <p className="text-neutral-variant text-sm">{t('welcome.addWatchOnlyLabel')}</p>
          <ButtonLink to={Paths.WATCH_ONLY} className="mt-10" variant="outline" pallet="primary" weight="lg">
            {t('welcome.addWatchOnlyButton')}
          </ButtonLink>
        </li>
        <li
          aria-label={t('welcome.addParitySignerAreaLabel')}
          role="listitem"
          style={{ background: `white url(${ParityBg}) no-repeat 30% 10%` }}
          className="flex flex-col items-center gap-y-5 border-2 border-transparent rounded-2lg p-10 shadow-element text-center focus:shadow-surface hover:shadow-surface focus-within:border-primary hover:border-primary focus-within:scale-105 hover:scale-105 ease-in transition-all"
        >
          <img src={ParitySignerImg} alt={t('welcome.addParitySignerAlt')} width={266} height={170} />
          <p className="text-neutral-variant text-sm">{t('welcome.addParitySignerLabel')}</p>
          <ButtonLink
            to={Paths.PARITY}
            className="mt-12"
            variant="fill"
            pallet="primary"
            weight="lg"
            suffixElement={<Icon name="qrCutout" size={20} />}
          >
            {t('welcome.addParitySignerButton')}
          </ButtonLink>
        </li>
        <li
          aria-label={t('welcome.addLedgerComingSoonLabel')}
          role="listitem"
          style={{ background: `white url(${LedgerBg}) no-repeat -20px 0px` }}
          className="flex flex-col items-center gap-y-5 rounded-2lg p-5 shadow-surface text-center relative"
        >
          <div className="absolute inset-0 bg-white/50 backdrop-blur-0.5 rounded-2lg" />
          <img src={LedgerImg} alt={t('welcome.ledgerImageAlt')} width={150} height={50} />
          <p className="text-neutral-variant text-sm">{t('welcome.addLedgerLabel')}</p>
          <ButtonLink to={Paths.LEDGER} className="mt-10" variant="outline" pallet="shade" weight="lg" disabled>
            {t('welcome.addLedgerButton')}
          </ButtonLink>
        </li>
      </ul>
    </div>
  );
};

export default Welcome;
