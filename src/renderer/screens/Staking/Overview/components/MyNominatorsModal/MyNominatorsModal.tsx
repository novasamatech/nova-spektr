import { Expandable, Explorers } from '@renderer/components/common';
import { Balance, BaseModal, Icon, Identicon } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';
import { Explorer } from '@renderer/domain/chain';
import { Validator } from '@renderer/domain/validator';
import { getShortAddress } from '@renderer/utils/strings';

type Props = {
  nominators: Validator[][];
  asset?: Asset;
  explorers?: Explorer[];
  isOpen: boolean;
  onClose: () => void;
};

const MyNominatorsModal = ({ nominators, asset, explorers, isOpen, onClose }: Props) => {
  const { t } = useI18n();

  if (!asset || !nominators.length) {
    return <div>LOADING</div>;
  }

  const [elected, notElected] = nominators;

  return (
    <BaseModal
      closeButton
      contentClass="w-[700px] py-6"
      title={t('staking.overview.yourValidatorsTitle')}
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
                <p className="font-semibold text-neutral-variant leading-tight">{t('staking.overview.electedTitle')}</p>
                <span className="ml-auto px-1.25 py-1 rounded-md bg-shade-10 text-2xs text-neutral-variant">
                  {elected.length}
                </span>
              </div>
            }
          >
            <div className="w-full border-t border-shade-5">
              <div className="flex py-2 pl-4 pr-11">
                <p className="text-2xs font-bold uppercase text-neutral-variant mr-auto">
                  {t('staking.overview.nominatorsColumnOne')}
                </p>
                <p className="pl-3 w-[125px] text-2xs font-bold uppercase text-neutral-variant text-right">
                  {t('staking.overview.nominatorsColumnTwo')}
                </p>
                <p className="pl-3 w-[125px] text-2xs font-bold uppercase text-neutral-variant text-right">
                  {t('staking.overview.nominatorsColumnTwo')}
                </p>
              </div>
              <ul>
                {elected.map(({ address, ownStake, apy, identity }) => (
                  <li
                    key={address}
                    className="flex items-center pl-4 pr-2 h-12.5 border-t border-shade-5 bg-shade-1 text-neutral"
                  >
                    <div className="flex gap-x-2.5 mr-auto">
                      <Identicon address={address} background={false} />
                      {identity ? (
                        <p className="text-sm font-semibold">
                          {identity.subName ? `${identity.parent.name}/${identity.subName}` : identity.parent.name}
                        </p>
                      ) : (
                        <p className="text-primary">{getShortAddress(address)}</p>
                      )}
                    </div>
                    <div className="pl-3 w-[125px] text-sm font-semibold text-success text-right">{apy}%</div>
                    <div className="pl-3 w-[125px] text-xs font-semibold text-right">
                      <Balance value={ownStake || '0'} precision={asset?.precision} symbol={asset?.symbol} />
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
                  {t('staking.overview.notElectedTitle')}
                </p>
                <p className="text-shade-40 text-2xs">{t('staking.overview.notElectedDescription')}</p>
                <span className="row-span-2 ml-auto px-1.25 py-1 rounded-md bg-shade-10 text-2xs text-neutral-variant">
                  {notElected.length}
                </span>
              </div>
            }
          >
            <ul>
              {notElected.map(({ address, identity }) => (
                <li key={address} className="flex items-center pl-4 pr-2 h-12.5 border-t border-shade-5 text-neutral">
                  <div className="flex gap-x-2.5 mr-auto">
                    <Identicon address={address} background={false} />
                    {identity ? (
                      <p className="text-sm font-semibold">
                        {identity.subName ? `${identity.parent.name}/${identity.subName}` : identity.parent.name}
                      </p>
                    ) : (
                      <p className="text-primary">{getShortAddress(address)}</p>
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

export default MyNominatorsModal;
