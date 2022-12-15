import { Icon } from '@renderer/components/ui';

const SplashScreen = () => {
  return (
    <main className="flex items-center justify-center bg-cover h-screen">
      <Icon as="img" name="logo" size={140} alt={process.env.PRODUCT_NAME} />
      <h1 className="text-5xl font-semibold text-neutral-variant">{process.env.PRODUCT_NAME}</h1>
    </main>
  );
};

export default SplashScreen;
