import { Icon } from '@renderer/components/ui';

const SplashScreen = () => {
  return (
    <main className="flex items-center justify-center bg-cover h-screen">
      {/* eslint-disable-next-line i18next/no-literal-string */}
      <Icon as="img" name="logo" size={120} alt="Omni" />
    </main>
  );
};

export default SplashScreen;
