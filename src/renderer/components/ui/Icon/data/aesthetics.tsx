import LoaderImg, { ReactComponent as LoaderSvg } from '@images/aesthetics/loader.svg';
import LoaderCutoutImg, { ReactComponent as LoaderCutoutSvg } from '@images/aesthetics/loader-cutout.svg';
import TwitterCutoutImg, { ReactComponent as TwitterCutoutSvg } from '@images/aesthetics/twitter-cutout.svg';
import TelegramCutoutImg, { ReactComponent as TelegramCutoutSvg } from '@images/aesthetics/telegram-cutout.svg';
import YoutubeCutoutImg, { ReactComponent as YoutubeCutoutSvg } from '@images/aesthetics/youtube-cutout.svg';
import GithubCutoutImg, { ReactComponent as GithubCutoutSvg } from '@images/aesthetics/github-cutout.svg';
import LanguageImg, { ReactComponent as LanguageSvg } from '@images/aesthetics/language.svg';
import ShieldImg, { ReactComponent as ShieldSvg } from '@images/aesthetics/shield.svg';

const AestheticImages = {
  loader: { svg: LoaderSvg, img: LoaderImg },
  loaderCutout: { svg: LoaderCutoutSvg, img: LoaderCutoutImg },
  twitterCutout: { svg: TwitterCutoutSvg, img: TwitterCutoutImg },
  telegramCutout: { svg: TelegramCutoutSvg, img: TelegramCutoutImg },
  youtubeCutout: { svg: YoutubeCutoutSvg, img: YoutubeCutoutImg },
  githubCutout: { svg: GithubCutoutSvg, img: GithubCutoutImg },
  language: { svg: LanguageSvg, img: LanguageImg },
  shield: { svg: ShieldSvg, img: ShieldImg },
} as const;

export type Aesthetic = keyof typeof AestheticImages;

export default AestheticImages;
