import AppleImg, { ReactComponent as AppleSvg } from '@shared/assets/images/social/apple.svg';
import FacebookImg, { ReactComponent as FacebookSvg } from '@shared/assets/images/social/facebook.svg';
import GithubImg, { ReactComponent as GithubSvg } from '@shared/assets/images/social/github.svg';
import GitlabImg, { ReactComponent as GitlabSvg } from '@shared/assets/images/social/gitlab.svg';
import GoogleImg, { ReactComponent as GoogleSvg } from '@shared/assets/images/social/google.svg';
import MatrixFullImg, { ReactComponent as MatrixFullSvg } from '@shared/assets/images/social/matrix-full.svg';
import MediumImg, { ReactComponent as MediumSvg } from '@shared/assets/images/social/medium.svg';
import TelegramImg, { ReactComponent as TelegramSvg } from '@shared/assets/images/social/telegram.svg';
import TwitterImg, { ReactComponent as TwitterSvg } from '@shared/assets/images/social/twitter.svg';
import YoutubeImg, { ReactComponent as YoutubeSvg } from '@shared/assets/images/social/youtube.svg';

const SocialImages = {
  apple: { svg: AppleSvg, img: AppleImg },
  google: { svg: GoogleSvg, img: GoogleImg },
  facebook: { svg: FacebookSvg, img: FacebookImg },
  github: { svg: GithubSvg, img: GithubImg },
  gitlab: { svg: GitlabSvg, img: GitlabImg },
  medium: { svg: MediumSvg, img: MediumImg },
  youtube: { svg: YoutubeSvg, img: YoutubeImg },
  twitter: { svg: TwitterSvg, img: TwitterImg },
  telegram: { svg: TelegramSvg, img: TelegramImg },
  matrixFull: { svg: MatrixFullSvg, img: MatrixFullImg },
} as const;

export type Social = keyof typeof SocialImages;

export default SocialImages;
