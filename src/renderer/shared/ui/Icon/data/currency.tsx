/* eslint-disable import-x/max-dependencies */

import BtcImg, { ReactComponent as BtcSvg } from '@/shared/assets/images/currency/btc.svg';
import EthImg, { ReactComponent as EthSvg } from '@/shared/assets/images/currency/eth.svg';
import EurImg, { ReactComponent as EurSvg } from '@/shared/assets/images/currency/eur.svg';
import GbpImg, { ReactComponent as GbpSvg } from '@/shared/assets/images/currency/gbp.svg';
import JpyImg, { ReactComponent as JpySvg } from '@/shared/assets/images/currency/jpy.svg';
import KhrImg, { ReactComponent as KhrSvg } from '@/shared/assets/images/currency/khr.svg';
import KztImg, { ReactComponent as KztSvg } from '@/shared/assets/images/currency/kzt.svg';
import RubImg, { ReactComponent as RubSvg } from '@/shared/assets/images/currency/rub.svg';
import UsdImg, { ReactComponent as UsdSvg } from '@/shared/assets/images/currency/usd.svg';

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
