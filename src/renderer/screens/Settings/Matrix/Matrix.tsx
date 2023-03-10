import { ButtonBack, Plate } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { useMatrix } from '@renderer/context/MatrixContext';
import LoginForm from './LoginForm/LoginForm';
import InfoSection from './InfoSection/InfoSection';
import Credentials from './Credentials/Credentials';
import PrivacyPolicy from './PrivacyPolicy/PrivacyPolicy';
import Verification from './Verification/Verification';

const Matrix = () => {
  const { t } = useI18n();
  const { isLoggedIn } = useMatrix();

  return (
    <div className="h-full flex flex-col gap-y-9">
      <div className="flex items-center gap-x-2.5 mt-5 px-5">
        <ButtonBack>
          <p className="font-semibold text-2xl text-neutral-variant">{t('settings.title')}</p>
          <p className="font-semibold text-2xl text-neutral">/</p>
          <h1 className="font-semibold text-2xl text-neutral">{t('settings.matrix.subTitle')}</h1>
        </ButtonBack>
      </div>

      <Plate as="section" className="mx-auto">
        <div className="grid grid-cols-[450px,270px] gap-x-10">
          {isLoggedIn ? (
            <div className="flex flex-col gap-y-5">
              <Credentials />
              <Verification />
            </div>
          ) : (
            <div className="flex flex-col gap-y-5">
              <LoginForm />
              <PrivacyPolicy />
            </div>
          )}
          <InfoSection />
        </div>
      </Plate>
    </div>
  );
};

export default Matrix;
