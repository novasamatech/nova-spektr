import { useUnit } from 'effector-react';
import { Link } from 'react-router-dom';

import { useI18n } from '@/shared/i18n';
import { useModalClose } from '@/shared/lib/hooks';
import { Step, formatBalance, isStep } from '@/shared/lib/utils';
import { type PathType, Paths, createLink } from '@/shared/routes';
import { BodyText, FootnoteText } from '@/shared/ui';
import { ChainIcon } from '@/shared/ui-entities';
import { Box, Modal, ScrollArea, SearchInput } from '@/shared/ui-kit';
import { EmptyAssetsState } from '@/entities/asset';
import { networkModel } from '@/entities/network';
import { AssetFiatBalance } from '@/widgets/price';
import { ModalType } from '../lib/types';
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

  const [isModalOpen, closeModal] = useModalClose(!isStep(step, Step.NONE), assetTransactionModel.flowClosed);

  if (!assetWithChains || modalType === null) {
    return null;
  }

  const { title, path } = getModalDetails(modalType);

  return (
    <Modal size="md" height="full" isOpen={isModalOpen} onToggle={closeModal}>
      <Modal.Title close>{t(title, { asset: assetWithChains.symbol })}</Modal.Title>
      <Modal.Content disableScroll>
        <Box shrink={0} padding={[3, 5, 0]}>
          <SearchInput
            value={query}
            placeholder={t('balances.searchPlaceholder')}
            onChange={assetTransactionModel.events.queryChanged}
          />
        </Box>
        <FootnoteText className="px-5 pt-4 pb-2 text-text-tertiary">{t('portfolilo.selectNetworkLabel')}</FootnoteText>
        <ScrollArea>
          <ul className="px-5 pb-5">
            {assetWithChains.chains.map((chain) => (
              <li
                key={`${chain.assetSymbol}_${chain.chainId}`}
                tabIndex={0}
                className="flex flex-col rounded-sm text-text-secondary hover:bg-action-background-hover hover:text-text-primary"
              >
                <Link
                  to={createLink(path, {}, { chainId: [chain.chainId], assetId: [chain.assetId] })}
                  onClick={() => assetTransactionModel.flowClosed()}
                >
                  <div className="flex items-center px-2 py-1.5">
                    <div className="mr-auto flex items-center gap-x-2 px-2 py-1">
                      <ChainIcon chain={chains[chain.chainId]} size={24} />
                      <BodyText className="text-inherit">{chain.name}</BodyText>
                    </div>
                    <div className="flex flex-col items-end">
                      <BodyText className="text-inherit">
                        {formatBalance(chain.balance?.transferable, assetWithChains.precision).formatted}&nbsp;
                        {assetWithChains.symbol}
                      </BodyText>
                      <AssetFiatBalance amount={chain.balance?.transferable} asset={assetWithChains} />
                    </div>
                  </div>
                </Link>
              </li>
            ))}
            <EmptyAssetsState size={64} />
          </ul>
        </ScrollArea>
      </Modal.Content>
    </Modal>
  );
};
