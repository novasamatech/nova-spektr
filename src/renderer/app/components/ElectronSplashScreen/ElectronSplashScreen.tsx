import logo from './assets/logo.svg';

export const ElectronSplashScreen = () => {
  return (
    <div className="animate-in fade-in flex h-full w-screen items-center justify-center duration-500">
      <img src={logo} />
    </div>
  );
};
