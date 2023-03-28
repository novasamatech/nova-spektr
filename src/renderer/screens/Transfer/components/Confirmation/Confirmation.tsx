import { ApiPromise } from '@polkadot/api';

import { Button, Balance, Icon, Address, Plate, Block } from '@renderer/components/ui';
import { Explorers, Fee } from '@renderer/components/common';
import { Asset } from '@renderer/domain/asset';
import { useI18n } from '@renderer/context/I18nContext';
import { Transaction } from '@renderer/domain/transaction';
import { Explorer } from '@renderer/domain/chain';

type Props = {
  api: ApiPromise;
  asset: Asset;
  nativeToken: Asset;
  icon: string;
  network: string;
  accountName: string;
  transaction: Transaction;
  explorers?: Explorer[];
  addressPrefix: number;
  onResult: () => void;
};

export const Confirmation = ({
  api,
  asset,
  nativeToken,
  icon,
  network,
  accountName,
  transaction,
  explorers,
  addressPrefix,
  onResult,
}: Props) => {
  const { t } = useI18n();

  const address = transaction.address;
  const destination = transaction.args.dest;
  const balance = transaction.args.value;

  return (
    <Plate as="section" className="w-[500px] flex flex-col items-center mx-auto gap-2.5">
      <Block>
        <p className="font-semibold text-xl text-neutral mb-5 m-auto w-fit">{t('transferDetails.title')}</p>
        <div className="font-bold text-4.5xl text-neutral m-auto w-fit">
          {'-'}
          <Balance className="inline-block" value={balance} precision={asset.precision} symbol={asset.symbol} />
        </div>

        <div className="mt-10 bg-shade-2 rounded-2lg border border-shade-5 divide-y">
          <div className="flex justify-between px-5 py-3">
            <div className="text-sm text-neutral-variant ">{t('transferDetails.fromNetwork')}</div>
            <div className="flex gap-1 items-center font-semibold">
              <img src={icon} alt="" width={16} height={16} />
              {network}
            </div>
          </div>
          <div className="flex justify-between px-5 py-3">
            <div className="text-sm text-neutral-variant ">{t('transferDetails.wallet')}</div>
            <div className="flex gap-1 items-center font-semibold">
              <Icon name="paritySignerBg" size={16} />
              {accountName}
            </div>
          </div>
          <div className="flex justify-between px-5 py-3">
            <div className="text-sm text-neutral-variant ">{t('transferDetails.sender')}</div>
            <div className="flex gap-1 items-center font-semibold">
              <Address type="short" address={address} addressStyle="large" size={18} />
              <Explorers explorers={explorers} addressPrefix={addressPrefix} address={address} />
            </div>
          </div>
        </div>
        <div className="mt-5 bg-shade-2 rounded-2lg border border-shade-5 divide-y">
          <div className="flex justify-between px-5 py-3">
            <div className="text-sm text-neutral-variant ">{t('transferDetails.networkFee')}</div>
            <div className="flex gap-1 items-center">
              <div className="flex gap-1 items-center font-semibold">
                <Fee api={api} asset={nativeToken} transaction={transaction} />
              </div>
            </div>
          </div>
          <div className="flex justify-between px-5 py-3">
            <div className="text-sm text-neutral-variant ">{t('transferDetails.recipient')}</div>
            <div className="flex gap-1 items-center">
              <div className="flex gap-1 items-center font-semibold">
                <Address type="short" address={destination} addressStyle="large" size={18} />
                <Explorers explorers={explorers} addressPrefix={addressPrefix} address={address} />
              </div>
            </div>
          </div>
        </div>
      </Block>
      <Button
        weight="lg"
        variant="fill"
        pallet="primary"
        className="w-fit flex-0 m-auto mt-5"
        suffixElement={<Icon name="qrLine" size={20} />}
        onClick={onResult}
      >
        {t('transfer.startSigningButton')}
      </Button>
    </Plate>
  );
};
