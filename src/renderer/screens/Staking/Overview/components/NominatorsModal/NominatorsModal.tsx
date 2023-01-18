import { Expandable, Explorers } from '@renderer/components/common';
import { Balance, BaseModal, Icon, Identicon } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';
import { Explorer } from '@renderer/domain/chain';
import { AccountID } from '@renderer/domain/shared-kernel';
import { getShortAddress } from '@renderer/utils/strings';

export type Nominator = {
  address: AccountID;
  apy: string;
  identity?: string;
  nominated: string;
};

type Props = {
  elected: Nominator[];
  notElected: Nominator[];
  asset?: Asset;
  explorers?: Explorer[];
  isOpen: boolean;
  onClose: () => void;
};

const NominatorsModal = ({ elected, notElected, asset, explorers, isOpen, onClose }: Props) => {
  const { t } = useI18n();

  return (
    <BaseModal
      closeButton
      contentClass="w-[700px] py-6"
      title={t('staking.nominators.yourValidatorsTitle')}
      isOpen={isOpen}
      onClose={onClose}
    >
      <div className="max-h-[600px] overflow-y-auto">
        {elected.length > 0 && (
          <Expandable
            wrapperClass="mb-5 mx-[15px] border border-shade-5 rounded-2lg"
            itemClass="px-[15px] py-2.5"
            item={
              <div className="flex items-center gap-x-2.5 w-full pr-2.5">
                <Icon className="text-success border border-success rounded-full p-[1px]" name="checkmark" size={18} />
                <p className="font-semibold text-neutral-variant leading-tight">
                  {t('staking.nominators.electedTitle')}
                </p>
                <span className="ml-auto px-1.25 py-1 rounded-md bg-shade-10 text-2xs text-neutral-variant">
                  {elected.length}
                </span>
              </div>
            }
          >
            <div className="w-full border-t border-shade-5">
              <div className="flex py-2 pl-4 pr-11">
                <p className="text-2xs font-bold uppercase text-neutral-variant mr-auto">
                  {t('staking.nominators.validators')}
                </p>
                <p className="pl-3 w-[125px] text-2xs font-bold uppercase text-neutral-variant text-right">
                  {t('staking.nominators.rewards')}
                </p>
                <p className="pl-3 w-[125px] text-2xs font-bold uppercase text-neutral-variant text-right">
                  {t('staking.nominators.nominated')}
                </p>
              </div>
              <ul>
                {elected.map(({ address, apy, identity, nominated = '0' }) => (
                  <li
                    key={address}
                    className="flex items-center pl-4 pr-2 h-12.5 border-t border-shade-5 bg-shade-1 text-neutral"
                  >
                    <div className="flex gap-x-2.5 mr-auto">
                      <Identicon address={address} background={false} />
                      {identity ? (
                        <p className="text-sm font-semibold">{identity}</p>
                      ) : (
                        <p className="text-primary">{getShortAddress(address)}</p>
                      )}
                    </div>
                    <div className="pl-3 w-[125px] text-sm font-semibold text-success text-right">{apy}%</div>
                    <div className="pl-3 w-[125px] text-xs text-right">
                      <Balance
                        className="font-semibold "
                        value={nominated}
                        precision={asset?.precision || 0}
                        symbol={asset?.symbol}
                      />
                      {nominated === '0' && (
                        <p className="text-2xs text-neutral-variant">{t('staking.nominators.notAssigned')}</p>
                      )}
                    </div>
                    <div className="ml-3">
                      <Explorers address={address} explorers={explorers} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </Expandable>
        )}

        {notElected.length > 0 && (
          <Expandable
            wrapperClass="mx-[15px] border border-shade-5 rounded-2lg"
            itemClass="px-[15px] py-1"
            item={
              <div className="grid grid-flow-col grid-cols-[repeat(2,max-content),1fr] gap-x-2.5 items-center w-full mr-2.5">
                <Icon className="row-span-2 text-neutral-variant" name="clock" size={18} />
                <p className="font-semibold text-neutral-variant leading-tight">
                  {t('staking.nominators.notElectedTitle')}
                </p>
                <p className="text-shade-40 text-2xs">{t('staking.nominators.notElectedDescription')}</p>
                <span className="row-span-2 ml-auto px-1.25 py-1 rounded-md bg-shade-10 text-2xs text-neutral-variant">
                  {notElected.length}
                </span>
              </div>
            }
          >
            <ul>
              {notElected.map(({ address, identity }) => (
                <li key={address} className="flex items-center pl-4 pr-2 h-12.5 border-t border-shade-5 text-neutral">
                  <div className="flex gap-x-2.5 items-center mr-auto">
                    <Identicon address={address} background={false} />
                    {identity ? (
                      <p className="text-neutral text-sm font-semibold">{identity}</p>
                    ) : (
                      <p className="text-neutral text-sm font-semibold">{getShortAddress(address, 10)}</p>
                    )}
                  </div>
                  <div className="ml-3">
                    <Explorers address={address} explorers={explorers} />
                  </div>
                </li>
              ))}
            </ul>
          </Expandable>
        )}
      </div>
    </BaseModal>
  );
};

export default NominatorsModal;
