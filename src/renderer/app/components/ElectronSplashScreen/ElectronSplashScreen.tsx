import logo from './assets/logo.svg';

export const ElectronSplashScreen = () => {
  return (
    <div className="flex h-screen w-screen items-center justify-center duration-500 animate-in fade-in">
      <img src={logo} />
    </div>
  );
};
