import AppleIcon from '@/shared/assets/images/social/apple.svg?jsx';
import FacebookIcon from '@/shared/assets/images/social/facebook.svg?jsx';
import GithubIcon from '@/shared/assets/images/social/github.svg?jsx';
import GitlabIcon from '@/shared/assets/images/social/gitlab.svg?jsx';
import GoogleIcon from '@/shared/assets/images/social/google.svg?jsx';
import MediumIcon from '@/shared/assets/images/social/medium.svg?jsx';
import TelegramIcon from '@/shared/assets/images/social/telegram.svg?jsx';
import TwitterIcon from '@/shared/assets/images/social/twitter.svg?jsx';
import YoutubeIcon from '@/shared/assets/images/social/youtube.svg?jsx';

const SocialImages = {
  apple: { svg: AppleIcon },
  google: { svg: GoogleIcon },
  facebook: { svg: FacebookIcon },
  github: { svg: GithubIcon },
  gitlab: { svg: GitlabIcon },
  medium: { svg: MediumIcon },
  youtube: { svg: YoutubeIcon },
  twitter: { svg: TwitterIcon },
  telegram: { svg: TelegramIcon },
} as const;

export type Social = keyof typeof SocialImages;

export default SocialImages;
