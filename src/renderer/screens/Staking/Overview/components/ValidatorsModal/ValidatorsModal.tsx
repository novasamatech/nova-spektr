import { ApiPromise } from '@polkadot/api';
import { useEffect, useState, ReactNode } from 'react';

import { Expandable, ExplorerLink } from '@renderer/components/common';
import { Icon, Balance, Identicon, Shimmering } from '@renderer/components/ui';
import { BaseModal, SmallTitleText, FootnoteText, InfoPopover, BodyText } from '@renderer/components/ui-redesign';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';
import { Explorer } from '@renderer/domain/chain';
import { Address } from '@renderer/domain/shared-kernel';
import { Validator } from '@renderer/domain/validator';
import { ValidatorMap } from '@renderer/services/staking/common/types';
import { useValidators } from '@renderer/services/staking/validatorsService';
import { getComposedIdentity } from '@renderer/shared/utils/strings';
import { toShortAddress } from '@renderer/shared/utils/address';
import NoValidators from '../EmptyState/NoValidators';

const VALIDATORS_SKELETON = Array.from({ length: 10 }, (_, index) => ({ address: index.toString() }));

type Props = {
  api?: ApiPromise;
  stash: Address;
  validators: ValidatorMap;
  asset?: Asset;
  explorers?: Explorer[];
  isOpen: boolean;
  onClose: () => void;
};

const ValidatorsModal = ({ api, stash, validators, asset, explorers, isOpen, onClose }: Props) => {
  const { t } = useI18n();
  const { getNominators } = useValidators();
  const [isValidatorsLoading, setIsValidatorsLoading] = useState(true);

  const [nominators, setNominators] = useState<Validator[]>([]);

  useEffect(() => {
    if (!api?.isConnected) return;

    setIsValidatorsLoading(true);

    getNominators(api, stash)
      .then((nominators) => {
        setNominators(Object.values(nominators));
      })
      .finally(() => setIsValidatorsLoading(false));
  }, [api, stash]);

  const [elected, notElected] = nominators.reduce<[Validator[], Validator[]]>(
    (acc, nominator) => {
      if (validators[nominator.address]) {
        acc[0].push(validators[nominator.address]);
      } else {
        acc[1].push(nominator);
      }

      return acc;
    },
    [[], []],
  );

  const validatorsExist = elected.length > 0 || notElected.length > 0;

  const getExplorers = (address: Address, explorers: Explorer[] = []) => {
    const explorersContent = explorers.map((explorer) => ({
      id: explorer.name,
      value: <ExplorerLink explorer={explorer} address={address} />,
    }));

    return [{ items: explorersContent }];
  };

  const getRow = (validator: Validator, asset?: Asset, explorers: Explorer[] = []): ReactNode => {
    if (!asset) return undefined;

    return (
      <li key={validator.address} className="grid grid-cols-[400px,120px,120px,1fr] items-center gap-x-6">
        <div className="flex gap-x-2">
          <Identicon address={validator.address} background={false} size={20} />
          {validator.identity ? (
            <BodyText>{getComposedIdentity(validator.identity)}</BodyText>
          ) : (
            <BodyText>{toShortAddress(validator.address, 11)}</BodyText>
          )}
        </div>
        <BodyText>
          <Balance value={validator.ownStake || '0'} precision={asset.precision} symbol={asset.symbol} />
        </BodyText>
        <BodyText>
          <Balance value={validator.totalStake || '0'} precision={asset.precision} symbol={asset.symbol} />
        </BodyText>
        <InfoPopover data={getExplorers(validator.address, explorers)} position="top-full right-0">
          <Icon name="info" size={14} className="text-icon-default ml-2 mr-auto" />
        </InfoPopover>
      </li>
    );
  };

  const loadingContent = (
    <div className="flex flex-col gap-y-4">
      <Shimmering width={130} height={22} />
      <div className="flex flex-col gap-y-2">
        <div className="grid grid-cols-[400px,120px,1fr] items-center gap-x-6">
          <Shimmering width={100} height={18} />
          <Shimmering width={95} height={18} />
          <Shimmering width={95} height={18} />
        </div>

        <ul className="flex flex-col gap-y-4">
          {VALIDATORS_SKELETON.map((v) => (
            <li key={v.address} className="grid grid-cols-[400px,120px,120px] items-center gap-x-6">
              <div className="flex items-center gap-x-1.5">
                <Shimmering circle width={20} height={20} />
                <Shimmering width={250} height={18} />
              </div>
              <Shimmering width={115} height={18} />
              <Shimmering width={115} height={18} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  return (
    <BaseModal
      closeButton
      contentClass="w-[784px] px-5 pb-4"
      title={t('staking.nominators.yourValidatorsTitle')}
      isOpen={isOpen}
      onClose={onClose}
    >
      {isValidatorsLoading && loadingContent}

      {!isValidatorsLoading && !validatorsExist && <NoValidators className="my-12" />}

      {!isValidatorsLoading && validatorsExist && (
        <div className="max-h-[512px] overflow-y-auto">
          {elected.length > 0 && (
            <Expandable
              itemClass="py-1.5"
              item={
                <div className="flex items-center gap-x-1 w-full">
                  <SmallTitleText>{t('staking.nominators.electedTitle')}</SmallTitleText>
                  <SmallTitleText className="text-text-tertiary">({elected.length})</SmallTitleText>
                </div>
              }
            >
              <div className="flex flex-col gap-y-2 mt-4">
                <div className="grid grid-cols-[400px,120px,1fr] items-center gap-x-6">
                  <FootnoteText className="text-text-secondary">
                    {t('staking.validators.validatorsTableHeader')}
                  </FootnoteText>
                  <FootnoteText className="text-text-secondary">
                    {t('staking.validators.ownStakeTableHeader')}
                  </FootnoteText>
                  <FootnoteText className="text-text-secondary">
                    {t('staking.validators.totalStakeTableHeader')}
                  </FootnoteText>
                </div>

                <ul className="flex flex-col gap-y-4">{elected.map((e) => getRow(e, asset, explorers))}</ul>
              </div>
            </Expandable>
          )}

          {notElected.length > 0 && (
            <Expandable
              itemClass="px-[15px] py-1 border-b border-shade-5"
              item={
                <div className="flex items-center gap-x-1 w-full">
                  <SmallTitleText>{t('staking.nominators.notElectedTitle')}</SmallTitleText>
                  <SmallTitleText className="text-text-tertiary">({notElected.length})</SmallTitleText>
                </div>
              }
            >
              <div className="flex flex-col gap-y-2 mt-4">
                <div className="grid grid-cols-[400px,120px,1fr] items-center gap-x-6">
                  <FootnoteText className="text-text-secondary">
                    {t('staking.validators.validatorsTableHeader')}
                  </FootnoteText>
                  <FootnoteText className="text-text-secondary">
                    {t('staking.validators.ownStakeTableHeader')}
                  </FootnoteText>
                  <FootnoteText className="text-text-secondary">
                    {t('staking.validators.totalStakeTableHeader')}
                  </FootnoteText>
                </div>

                <ul className="flex flex-col gap-y-4">
                  <ul className="flex flex-col gap-y-4">{notElected.map((n) => getRow(n, asset, explorers))}</ul>
                </ul>
              </div>
            </Expandable>
          )}
        </div>
      )}
    </BaseModal>
  );
};

export default ValidatorsModal;
