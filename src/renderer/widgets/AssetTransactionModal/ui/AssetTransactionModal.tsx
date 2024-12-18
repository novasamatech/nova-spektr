import { useUnit } from 'effector-react';
import { Link } from 'react-router-dom';

import { useI18n } from '@/shared/i18n';
import { useModalClose } from '@/shared/lib/hooks';
import { totalAmount } from '@/shared/lib/utils';
import { type PathType, Paths, createLink } from '@/shared/routes';
import { BodyText, FootnoteText } from '@/shared/ui';
import { Box, Modal, SearchInput } from '@/shared/ui-kit';
import { EmptyAssetsState } from '@/entities/asset';
import { ChainIcon } from '@/entities/chain';
import { networkModel } from '@/entities/network';
import { AssetFiatBalance } from '@/entities/price';
import { ModalType } from '../lib/types';
import { assetTransactionUtils } from '../lib/utils';
import { assetTransactionModel } from '../model/asset-transaction-model';

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

  if (!assetWithChains || modalType === null) {
    return null;
  }

  const { title, path } = getModalDetails(modalType);

  return (
    <Modal size="md" isOpen={isModalOpen} onToggle={closeModal}>
      <Modal.Title close>{t(title, { asset: assetWithChains.symbol })}</Modal.Title>
      <Modal.Content>
        <Box padding={[3, 5]}>
          <SearchInput
            value={query}
            placeholder={t('balances.searchPlaceholder')}
            onChange={assetTransactionModel.events.queryChanged}
          />
          <FootnoteText className="pb-2 pt-4 text-text-tertiary">{t('portfolilo.selectNetworkLabel')}</FootnoteText>
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
                  <div className="flex items-center px-2 py-1.5">
                    <div className="mr-auto flex items-center gap-x-2 px-2 py-1">
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
            <EmptyAssetsState />
          </ul>
        </Box>
      </Modal.Content>
    </Modal>
  );
};
