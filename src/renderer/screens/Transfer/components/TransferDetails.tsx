import { Explorers } from '@renderer/components/common';
import { Address, Balance, Icon } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';
import { formatAddress } from '@renderer/utils/address';
import { Transaction } from '@renderer/domain/transaction';
import { Wallet } from '@renderer/domain/wallet';
import { ExtendedChain } from '@renderer/services/network/common/types';
import Fee from './Fee';

type Props = {
  transaction: Transaction;
  wallet: Wallet;
  asset: Asset;
  connection: ExtendedChain;
};

const Transfer = ({ transaction, wallet, asset, connection }: Props) => {
  const { t } = useI18n();

  const currentAddress = formatAddress(
    wallet?.mainAccounts[0].accountId || wallet?.chainAccounts[0].accountId || '',
    connection?.addressPrefix,
  );

  const {
    args: { value, dest },
  } = transaction;

  return (
    <div className="w-[500px] rounded-2xl bg-shade-2 p-5 flex flex-col items-center m-auto gap-2.5">
      <div className="bg-white shadow-surface p-5 rounded-2xl w-full">
        <div className="font-semibold text-xl text-neutral mb-5 m-auto w-fit">{t('transferDetails.title')}</div>
        <div className="font-bold text-[44px] text-neutral m-auto w-fit">
          {/* eslint-disable i18next/no-literal-string */}
          -<Balance value={value} precision={asset.precision} /> {asset.symbol}
          {/* eslint-enable i18next/no-literal-string */}
        </div>

        <div className="mt-10 bg-shade-2 rounded-2lg border border-shade-5 divide-y">
          <div className="flex justify-between px-5 py-3">
            <div className="text-sm text-neutral-variant ">{t('transferDetails.fromNetwork')}</div>
            <div className="flex gap-1 items-center">
              <img src={asset?.icon} alt="" width={16} height={16} />
              {asset?.name}
            </div>
          </div>
          <div className="flex justify-between px-5 py-3">
            <div className="text-sm text-neutral-variant ">{t('transferDetails.wallet')}</div>
            <div className="flex gap-1 items-center">
              <Icon name="paritySigner" size={16} />
              {wallet.name}
            </div>
          </div>
          <div className="flex justify-between px-5 py-3">
            <div className="text-sm text-neutral-variant ">{t('transferDetails.sender')}</div>
            <div className="flex gap-1 items-center">
              {currentAddress && connection && (
                <div className="flex gap-1 items-center">
                  <Address type="short" address={currentAddress} addressStyle="normal" size={14} />
                  <Explorers chain={connection} address={currentAddress} />
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="mt-5 bg-shade-2 rounded-2lg border border-shade-5 divide-y">
          <div className="flex justify-between px-5 py-3">
            <div className="text-sm text-neutral-variant ">{t('transferDetails.networkFee')}</div>
            <div className="flex gap-1 items-center">
              <div className="flex gap-1 items-center">
                <Fee connection={connection} wallet={wallet} transaction={transaction} />
              </div>
            </div>
          </div>
          <div className="flex justify-between px-5 py-3">
            <div className="text-sm text-neutral-variant ">{t('transferDetails.recipient')}</div>
            <div className="flex gap-1 items-center">
              <div className="flex gap-1 items-center">
                <Address type="short" address={dest} addressStyle="normal" size={14} />
                <Explorers chain={connection} address={currentAddress} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Transfer;
