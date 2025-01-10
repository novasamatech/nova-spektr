/* eslint-disable import-x/max-dependencies */

import BtcIcon from '@/shared/assets/images/currency/btc.svg?jsx';
import EthIcon from '@/shared/assets/images/currency/eth.svg?jsx';
import EurIcon from '@/shared/assets/images/currency/eur.svg?jsx';
import GbpIcon from '@/shared/assets/images/currency/gbp.svg?jsx';
import JpyIcon from '@/shared/assets/images/currency/jpy.svg?jsx';
import KhrIcon from '@/shared/assets/images/currency/khr.svg?jsx';
import KztIcon from '@/shared/assets/images/currency/kzt.svg?jsx';
import RubIcon from '@/shared/assets/images/currency/rub.svg?jsx';
import UsdIcon from '@/shared/assets/images/currency/usd.svg?jsx';

const CurrencyImages = {
  btc: { svg: BtcIcon },
  eth: { svg: EthIcon },
  eur: { svg: EurIcon },
  gbp: { svg: GbpIcon },
  jpy: { svg: JpyIcon },
  khr: { svg: KhrIcon },
  kzt: { svg: KztIcon },
  rub: { svg: RubIcon },
  usd: { svg: UsdIcon },
} as const;

export type Currency = keyof typeof CurrencyImages;

export default CurrencyImages;
