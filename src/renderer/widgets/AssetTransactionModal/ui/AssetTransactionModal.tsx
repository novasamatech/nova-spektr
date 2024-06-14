import { useUnit } from 'effector-react';
import { Link } from 'react-router-dom';

import { useI18n } from '@app/providers';
import { BaseModal, BodyText, FootnoteText, HeaderTitleText, Icon, SearchInput } from '@shared/ui';
import { useModalClose } from '@shared/lib/hooks';
import { totalAmount } from '@shared/lib/utils';
import { PathType, Paths, createLink } from '@shared/routes';
import { ChainIcon } from '@entities/chain';
import { networkModel } from '@entities/network';
import { AssetFiatBalance } from '@entities/price';
import { assetTransactionModel } from '../model/asset-transaction-model';
import { assetTransactionUtils } from '../lib/utils';
import { ModalType } from '../lib/types';

type ModalDetailsProps = { title: string; path: PathType };

const getModalDetails = (modalType: ModalType): ModalDetailsProps => {
  const modalDetailsMap = {
    [ModalType.TRANSFER]: {
      title: 'operations.modalTitles.transferOn',
      path: Paths.TRANSFER_ASSET,
    },
    [ModalType.RECEIVE]: {
      title: 'receive.title',
      path: Paths.RECEIVE_ASSET,
    },
  };

  return modalDetailsMap[modalType];
};

export const AssetTransactionModal = () => {
  const { t } = useI18n();

  const assetWithChains = useUnit(assetTransactionModel.$assetWithChains);
  const step = useUnit(assetTransactionModel.$step);
  const modalType = useUnit(assetTransactionModel.$modalType);
  const query = useUnit(assetTransactionModel.$query);
  const chains = useUnit(networkModel.$chains);

  const [isModalOpen, closeModal] = useModalClose(
    !assetTransactionUtils.isNoneStep(step),
    assetTransactionModel.output.flowClosed,
  );

  if (!assetWithChains || modalType === null) return null;

  const { title, path } = getModalDetails(modalType);
  const modalTitle = <HeaderTitleText>{t(title, { asset: assetWithChains.symbol })}</HeaderTitleText>;

  return (
    <BaseModal
      closeButton
      panelClass="max-h-[610px] overflow-y-auto"
      headerClass="p-3 pl-5 pb-7"
      isOpen={isModalOpen}
      title={modalTitle}
      onClose={closeModal}
    >
      <SearchInput
        value={query}
        placeholder={t('balances.searchPlaceholder')}
        className="w-full"
        onChange={assetTransactionModel.events.queryChanged}
      />
      <FootnoteText className="text-text-tertiary pt-4 pb-2">{t('portfolilo.selectNetworkLabel')}</FootnoteText>
      <ul>
        {assetWithChains.chains.map((chain) => (
          <li
            key={`${chain.assetSymbol}_${chain.chainId}`}
            tabIndex={0}
            className="flex flex-col rounded text-text-secondary hover:bg-action-background-hover hover:text-text-primary"
          >
            <Link
              to={createLink(path, {}, { chainId: [chain.chainId], assetId: [chain.assetId] })}
              onClick={() => assetTransactionModel.output.flowClosed()}
            >
              <div className="flex items-center py-1.5 px-2">
                <div className="flex items-center gap-x-2 px-2 py-1 mr-auto">
                  <ChainIcon src={chains[chain.chainId].icon} name={chain.name} size={24} />
                  <BodyText className="text-inherit">{chain.name}</BodyText>
                </div>
                <div className="flex flex-col items-end">
                  <BodyText className="text-inherit">
                    {assetTransactionUtils.getChainBalance(t, chain, assetWithChains.precision)}
                  </BodyText>
                  <AssetFiatBalance amount={totalAmount(chain.balance)} asset={assetWithChains} />
                </div>
              </div>
            </Link>
          </li>
        ))}

        <div className="hidden only:flex flex-col items-center justify-center gap-y-8 w-full h-full">
          <Icon as="img" name="emptyList" alt={t('balances.emptyStateLabel')} size={178} />
          <BodyText align="center" className="text-text-tertiary">
            {t('balances.emptyStateLabel')}
            <br />
            {t('balances.emptyStateDescription')}
          </BodyText>
        </div>
      </ul>
    </BaseModal>
  );
};