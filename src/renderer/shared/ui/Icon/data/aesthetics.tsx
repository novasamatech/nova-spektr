import LoaderImg, { ReactComponent as LoaderSvg } from '@shared/assets/images/aesthetics/loader.svg';
import LanguageImg, { ReactComponent as LanguageSvg } from '@shared/assets/images/aesthetics/language.svg';
import ShieldImg, { ReactComponent as ShieldSvg } from '@shared/assets/images/aesthetics/shield.svg';
import GlobeImg, { ReactComponent as GlobeSvg } from '@shared/assets/images/aesthetics/globe.svg';
import SortImg, { ReactComponent as SortSvg } from '@shared/assets/images/aesthetics/sort.svg';
import ClockImg, { ReactComponent as ClockSvg } from '@shared/assets/images/aesthetics/clock.svg';
import InfoImg, { ReactComponent as InfoSvg } from '@shared/assets/images/aesthetics/info.svg';
import WarnImg, { ReactComponent as WarnSvg } from '@shared/assets/images/aesthetics/warning.svg';
import ChatImg, { ReactComponent as ChatSvg } from '@shared/assets/images/aesthetics/chat.svg';
import ChatRedesignImg, { ReactComponent as ChatRedesignSvg } from '@shared/assets/images/aesthetics/chat-redesign.svg';
import BellImg, { ReactComponent as BellSvg } from '@shared/assets/images/aesthetics/bell.svg';
import QuestionImg, { ReactComponent as QuestionSvg } from '@shared/assets/images/aesthetics/question.svg';
import HotkeyCtrlImg, { ReactComponent as HotkeyCtrlSvg } from '@shared/assets/images/aesthetics/hotkey-ctrl.svg';
import HotkeyOptionImg, { ReactComponent as HotkeyOptionSvg } from '@shared/assets/images/aesthetics/hotkey-option.svg';

const AestheticImages = {
  loader: { svg: LoaderSvg, img: LoaderImg },
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
  chatRedesign: { svg: ChatRedesignSvg, img: ChatRedesignImg },
  hotkeyCtrl: { svg: HotkeyCtrlSvg, img: HotkeyCtrlImg },
  hotkeyOption: { svg: HotkeyOptionSvg, img: HotkeyOptionImg },
} as const;

export type Aesthetic = keyof typeof AestheticImages;

export default AestheticImages;
