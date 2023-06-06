import LoaderImg, { ReactComponent as LoaderSvg } from '@images/aesthetics/loader.svg';
import LoaderCutoutImg, { ReactComponent as LoaderCutoutSvg } from '@images/aesthetics/loader-cutout.svg';
import LanguageImg, { ReactComponent as LanguageSvg } from '@images/aesthetics/language.svg';
import ShieldImg, { ReactComponent as ShieldSvg } from '@images/aesthetics/shield.svg';
import GlobeImg, { ReactComponent as GlobeSvg } from '@images/aesthetics/globe.svg';
import SortImg, { ReactComponent as SortSvg } from '@images/aesthetics/sort.svg';
import ClockImg, { ReactComponent as ClockSvg } from '@images/aesthetics/clock.svg';
import InfoImg, { ReactComponent as InfoSvg } from '@images/aesthetics/info.svg';
import WarnImg, { ReactComponent as WarnSvg } from '@images/aesthetics/warning.svg';
import ChatImg, { ReactComponent as ChatSvg } from '@images/aesthetics/chat.svg';
import ChatRedesignImg, { ReactComponent as ChatRedesignSvg } from '@images/aesthetics/chat-redesign.svg';
import BellImg, { ReactComponent as BellSvg } from '@images/aesthetics/bell.svg';
import QuestionImg, { ReactComponent as QuestionSvg } from '@images/aesthetics/question.svg';
import LoaderRedesignImg, { ReactComponent as LoaderRedesignSvg } from '@images/aesthetics/loader-redesign.svg';

const AestheticImages = {
  loader: { svg: LoaderSvg, img: LoaderImg },
  loaderCutout: { svg: LoaderCutoutSvg, img: LoaderCutoutImg },
  language: { svg: LanguageSvg, img: LanguageImg },
  shield: { svg: ShieldSvg, img: ShieldImg },
  globe: { svg: GlobeSvg, img: GlobeImg },
  sort: { svg: SortSvg, img: SortImg },
  clock: { svg: ClockSvg, img: ClockImg },
  info: { svg: InfoSvg, img: InfoImg },
  warn: { svg: WarnSvg, img: WarnImg },
  chat: { svg: ChatSvg, img: ChatImg },
  bell: { svg: BellSvg, img: BellImg },
  question: { svg: QuestionSvg, img: QuestionImg },
  loaderRedesign: { svg: LoaderRedesignSvg, img: LoaderRedesignImg },
  chatRedesign: { svg: ChatRedesignSvg, img: ChatRedesignImg },
} as const;

export type Aesthetic = keyof typeof AestheticImages;

export default AestheticImages;
