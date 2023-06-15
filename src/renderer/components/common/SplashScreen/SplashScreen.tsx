import SplashWEBM from '@video/splash_screen.webm';
import SplashMP4 from '@video/splash_screen.mp4';

const SplashScreen = () => {
  const removeSvgPlaceholder = () => {
    document.querySelector('.splash_placeholder')?.remove();
  };

  return (
    <video
      autoPlay
      muted
      width="1024"
      height="800"
      data-testid="splash-video"
      className="object-none fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      onCanPlay={removeSvgPlaceholder}
    >
      <source src={SplashWEBM} type="video/webm" />
      <source src={SplashMP4} type="video/mp4" />
    </video>
  );
};

export default SplashScreen;
