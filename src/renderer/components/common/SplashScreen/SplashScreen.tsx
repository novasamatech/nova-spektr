import { Icon } from '@renderer/components/ui';

const SplashScreen = () => {
  return (
    <main className="flex items-center justify-center bg-cover h-screen">
      <Icon as="img" name="logo" size={120} alt="Omni enterprise" />
    </main>
  );
};

export default SplashScreen;
