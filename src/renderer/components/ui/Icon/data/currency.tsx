import BtcImg, { ReactComponent as BtcSvg } from '@images/currency/btc.svg';
import EthImg, { ReactComponent as EthSvg } from '@images/currency/eth.svg';
import EurImg, { ReactComponent as EurSvg } from '@images/currency/eur.svg';
import GbpImg, { ReactComponent as GbpSvg } from '@images/currency/gbp.svg';
import JpyImg, { ReactComponent as JpySvg } from '@images/currency/jpy.svg';
import KhrImg, { ReactComponent as KhrSvg } from '@images/currency/khr.svg';
import KztImg, { ReactComponent as KztSvg } from '@images/currency/kzt.svg';
import RubImg, { ReactComponent as RubSvg } from '@images/currency/rub.svg';
import UsdImg, { ReactComponent as UsdSvg } from '@images/currency/usd.svg';

const CurrencyImages = {
  btc: { svg: BtcSvg, img: BtcImg },
  eth: { svg: EthSvg, img: EthImg },
  eur: { svg: EurSvg, img: EurImg },
  gbp: { svg: GbpSvg, img: GbpImg },
  jpy: { svg: JpySvg, img: JpyImg },
  khr: { svg: KhrSvg, img: KhrImg },
  kzt: { svg: KztSvg, img: KztImg },
  rub: { svg: RubSvg, img: RubImg },
  usd: { svg: UsdSvg, img: UsdImg },
} as const;

export type Currency = keyof typeof CurrencyImages;

export default CurrencyImages;
