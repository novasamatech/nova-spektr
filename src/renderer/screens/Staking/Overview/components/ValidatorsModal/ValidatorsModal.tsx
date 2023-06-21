import { ApiPromise } from '@polkadot/api';
import { useEffect, useState, ReactNode } from 'react';

import { ExplorerLink } from '@renderer/components/common';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';
import { Explorer } from '@renderer/domain/chain';
import { Address } from '@renderer/domain/shared-kernel';
import { Validator } from '@renderer/domain/validator';
import { ValidatorMap } from '@renderer/services/staking/common/types';
import { useValidators } from '@renderer/services/staking/validatorsService';
import { getComposedIdentity } from '@renderer/shared/utils/strings';
import { toShortAddress } from '@renderer/shared/utils/address';
import { NoValidators } from '../EmptyState/NoValidators';
import { Icon, Balance, Identicon, Loader } from '@renderer/components/ui';
import {
  BaseModal,
  SmallTitleText,
  FootnoteText,
  InfoPopover,
  BodyText,
  Accordion,
} from '@renderer/components/ui-redesign';

type Props = {
  api?: ApiPromise;
  stash: Address;
  validators: ValidatorMap;
  asset?: Asset;
  explorers?: Explorer[];
  isOpen: boolean;
  isLightClient?: boolean;
  onClose: () => void;
};

export const ValidatorsModal = ({
  api,
  stash,
  validators,
  asset,
  explorers,
  isOpen,
  isLightClient,
  onClose,
}: Props) => {
  const { t } = useI18n();
  const { getNominators } = useValidators();
  const [isValidatorsLoading, setIsValidatorsLoading] = useState(true);

  const [nominators, setNominators] = useState<Validator[]>([]);

  useEffect(() => {
    if (!api?.isConnected) return;

    setIsValidatorsLoading(true);

    getNominators(api, stash, isLightClient)
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
      <li key={validator.address} className="grid grid-cols-[400px,130px,130px,1fr] items-center gap-x-6">
        <InfoPopover data={getExplorers(validator.address, explorers)} position="top-full right-0">
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
          <Icon name="info" size={14} className="text-icon-default hover:text-icon-hover" />
        </InfoPopover>
      </li>
    );
  };

  return (
    <BaseModal
      closeButton
      contentClass=""
      headerClass="py-4 px-5"
      panelClass="w-[784px]"
      title={t('staking.nominators.yourValidatorsTitle')}
      isOpen={isOpen}
      onClose={onClose}
    >
      {isValidatorsLoading && (
        <div className="h-[366px] flex items-center justify-center">
          <Loader className="my-24 mx-auto" color="primary" size={25} />
        </div>
      )}

      {!isValidatorsLoading && !validatorsExist && <NoValidators className="my-12" />}

      {!isValidatorsLoading && validatorsExist && (
        <div className="max-h-[512px] flex flex-col gap-y-5 px-5 pt-5 pb-4 overflow-y-auto">
          {elected.length > 0 && (
            <Accordion isDefaultOpen>
              <Accordion.Button>
                <div className="flex items-center gap-x-1 w-full">
                  <SmallTitleText>{t('staking.nominators.electedTitle')}</SmallTitleText>
                  <SmallTitleText className="text-text-tertiary">({elected.length})</SmallTitleText>
                </div>
              </Accordion.Button>
              <Accordion.Content>
                <div className="flex flex-col gap-y-2 mt-4">
                  <div className="grid grid-cols-[400px,130px,1fr] items-center gap-x-6">
                    <FootnoteText className="text-text-tertiary">
                      {t('staking.validators.validatorTableHeader')}
                    </FootnoteText>
                    <FootnoteText className="text-text-tertiary">
                      {t('staking.validators.ownStakeTableHeader')}
                    </FootnoteText>
                    <FootnoteText className="text-text-tertiary">
                      {t('staking.validators.totalStakeTableHeader')}
                    </FootnoteText>
                  </div>

                  <ul className="flex flex-col gap-y-4">{elected.map((e) => getRow(e, asset, explorers))}</ul>
                </div>
              </Accordion.Content>
            </Accordion>
          )}

          {notElected.length > 0 && (
            <Accordion isDefaultOpen>
              <Accordion.Button>
                <div className="flex items-center gap-x-1 w-full">
                  <SmallTitleText>{t('staking.nominators.notElectedTitle')}</SmallTitleText>
                  <SmallTitleText className="text-text-tertiary">({notElected.length})</SmallTitleText>
                </div>
              </Accordion.Button>
              <Accordion.Content>
                <div className="flex flex-col gap-y-2 mt-4">
                  <div className="grid grid-cols-[400px,130px,1fr] items-center gap-x-6">
                    <FootnoteText className="text-text-tertiary">
                      {t('staking.validators.validatorTableHeader')}
                    </FootnoteText>
                    <FootnoteText className="text-text-tertiary">
                      {t('staking.validators.ownStakeTableHeader')}
                    </FootnoteText>
                    <FootnoteText className="text-text-tertiary">
                      {t('staking.validators.totalStakeTableHeader')}
                    </FootnoteText>
                  </div>

                  <ul className="flex flex-col gap-y-4">
                    <ul className="flex flex-col gap-y-4">{notElected.map((n) => getRow(n, asset, explorers))}</ul>
                  </ul>
                </div>
              </Accordion.Content>
            </Accordion>
          )}
        </div>
      )}
    </BaseModal>
  );
};
