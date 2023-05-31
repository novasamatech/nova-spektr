import AppleImg, { ReactComponent as AppleSvg } from '@images/social/apple.svg';
import GoogleImg, { ReactComponent as GoogleSvg } from '@images/social/google.svg';
import FacebookImg, { ReactComponent as FacebookSvg } from '@images/social/facebook.svg';
import GithubImg, { ReactComponent as GithubSvg } from '@images/social/github.svg';
import GitlabImg, { ReactComponent as GitlabSvg } from '@images/social/gitlab.svg';
import MediumImg, { ReactComponent as MediumSvg } from '@images/social/medium.svg';
import YoutubeImg, { ReactComponent as YoutubeSvg } from '@images/social/youtube.svg';
import TwitterImg, { ReactComponent as TwitterSvg } from '@images/social/twitter.svg';
import TelegramImg, { ReactComponent as TelegramSvg } from '@images/social/telegram.svg';

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
} as const;

export type Social = keyof typeof SocialImages;

export default SocialImages;
