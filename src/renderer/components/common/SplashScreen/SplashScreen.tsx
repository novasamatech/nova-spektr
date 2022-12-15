import { Icon } from '@renderer/components/ui';

const SplashScreen = () => {
  return (
    <main className="flex items-center justify-center bg-cover h-screen">
      <Icon as="img" name="logo" size={140} alt="Omni enterprise" />
      {/* eslint-disable-next-line i18next/no-literal-string */}
      <h1 className="text-5xl font-semibold text-neutral-variant">Omni Enterprise</h1>
    </main>
  );
};

export default SplashScreen;
