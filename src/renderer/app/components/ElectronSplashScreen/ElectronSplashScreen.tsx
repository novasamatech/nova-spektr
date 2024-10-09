import logo from './assets/logo.svg';

export const ElectronSplashScreen = () => {
  return (
    <div className="duration-400 flex h-screen w-screen items-center justify-center animate-in fade-in">
      <img src={logo} />
    </div>
  );
};
