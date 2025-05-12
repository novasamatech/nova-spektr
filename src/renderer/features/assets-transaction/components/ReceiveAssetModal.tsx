import { useUnit } from 'effector-react';

import { type Asset, type Chain } from '@/shared/core';
import { useFlow } from '@/shared/effector';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { Modal } from '@/shared/ui-kit';
import { OperationTitle } from '@/entities/chain';
import { receiveModel } from '../model/receive-model';

import { ReceiveAssetContent } from './ReceiveAssetContent';
import { SelectAccount } from './SelectAccount';

type Props = {
  chain: Chain;
  asset: Asset;
};

export const ReceiveAssetModal = ({ chain, asset }: Props) => {
  const { t } = useI18n();
  useFlow(receiveModel.flow, { chain });

  const selectedAccount = useUnit(receiveModel.$selectedAccount);

  const [isModalOpen, toggleIsModalOpen] = useToggle(true);

  const closeReceiveModal = () => {
    toggleIsModalOpen();
    receiveModel.flow.close({ chain: null });
  };

  return (
    <Modal size="md" isOpen={isModalOpen} onToggle={closeReceiveModal}>
      <Modal.Title close>
        <OperationTitle title={t('receive.title', { asset: asset.symbol })} chainId={chain.chainId} />
      </Modal.Title>
      <Modal.Content disableScroll>
        {selectedAccount ? (
          <ReceiveAssetContent chain={chain} asset={asset} />
        ) : (
          <SelectAccount asset={asset} chain={chain} />
        )}
      </Modal.Content>
    </Modal>
  );
};
