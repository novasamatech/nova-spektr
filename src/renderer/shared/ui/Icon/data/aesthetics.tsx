import LoaderImg, { ReactComponent as LoaderSvg } from '@shared/assets/images/aesthetics/loader.svg';
import FireImg, { ReactComponent as FireSvg } from '@shared/assets/images/aesthetics/fire.svg';
import ClockImg, { ReactComponent as ClockSvg } from '@shared/assets/images/aesthetics/clock.svg';
import GlobeImg, { ReactComponent as GlobeSvg } from '@shared/assets/images/aesthetics/globe.svg';
import InfoImg, { ReactComponent as InfoSvg } from '@shared/assets/images/aesthetics/info.svg';
import WarnImg, { ReactComponent as WarnSvg } from '@shared/assets/images/aesthetics/warning.svg';
import ChatImg, { ReactComponent as ChatSvg } from '@shared/assets/images/aesthetics/chat.svg';
import QuestionImg, { ReactComponent as QuestionSvg } from '@shared/assets/images/aesthetics/question.svg';
import HotkeyCtrlImg, { ReactComponent as HotkeyCtrlSvg } from '@shared/assets/images/aesthetics/hotkey-ctrl.svg';
import HotkeyOptionImg, { ReactComponent as HotkeyOptionSvg } from '@shared/assets/images/aesthetics/hotkey-option.svg';

const AestheticImages = {
  loader: { svg: LoaderSvg, img: LoaderImg },
  fire: { svg: FireSvg, img: FireImg },
  clock: { svg: ClockSvg, img: ClockImg },
  globe: { svg: GlobeSvg, img: GlobeImg },
  info: { svg: InfoSvg, img: InfoImg },
  warn: { svg: WarnSvg, img: WarnImg },
  chat: { svg: ChatSvg, img: ChatImg },
  question: { svg: QuestionSvg, img: QuestionImg },
  hotkeyCtrl: { svg: HotkeyCtrlSvg, img: HotkeyCtrlImg },
  hotkeyOption: { svg: HotkeyOptionSvg, img: HotkeyOptionImg },
} as const;

export type Aesthetic = keyof typeof AestheticImages;

export default AestheticImages;
