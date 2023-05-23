import AppleImg, { ReactComponent as AppleSvg } from '@images/social/apple.svg';
import GoogleImg, { ReactComponent as GoogleSvg } from '@images/social/google.svg';
import FacebookImg, { ReactComponent as FacebookSvg } from '@images/social/facebook.svg';
import GithubImg, { ReactComponent as GithubSvg } from '@images/social/github.svg';
import GitlabImg, { ReactComponent as GitlabSvg } from '@images/social/gitLab.svg';

const SocialImages = {
  apple: { svg: AppleSvg, img: AppleImg },
  google: { svg: GoogleSvg, img: GoogleImg },
  facebook: { svg: FacebookSvg, img: FacebookImg },
  github: { svg: GithubSvg, img: GithubImg },
  gitlab: { svg: GitlabSvg, img: GitlabImg },
} as const;

export type Social = keyof typeof SocialImages;

export default SocialImages;
