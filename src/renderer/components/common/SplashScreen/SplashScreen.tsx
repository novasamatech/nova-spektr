import { Icon } from '@renderer/components/ui';

const SplashScreen = () => {
  return (
    <main className="flex items-center justify-center bg-stripes bg-cover h-screen">
      <Icon as="img" name="logo" size={120} alt="Omni logo" />
    </main>
  );
};

export default SplashScreen;
