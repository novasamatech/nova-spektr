import { useUnit } from 'effector-react';
import { useLayoutEffect } from 'react';

import { type ChainId, type ReferendumId } from '@/shared/core';
import { Loader } from '@/shared/ui';
import { Modal } from '@/shared/ui-kit';
import { networkSelectorModel } from '@/features/governance';
import { GovernanceReferendumDetailsModal, useReferendum } from '@/pages/Governance';

type Props = {
  chainId: ChainId;
  referendumId: ReferendumId;
  onClose: () => void;
};

/**
 * Mounts the app's referendum modal outside the Governance page.
 *
 * The modal, its vote flows and every governance aggregate behind it read the
 * chain from `networkSelectorModel` — a single global selection — so the row's
 * chain is selected first and nothing renders until the selector agrees.
 * `$governanceChainId` is not persisted and the Governance page re-selects from
 * its URL on entry, so the switch leaves no residue.
 */
export const DashboardReferendumDetails = ({ chainId, referendumId, onClose }: Props) => {
  const [selectedChainId, network, selectNetwork] = useUnit([
    networkSelectorModel.$governanceChainId,
    networkSelectorModel.$network,
    networkSelectorModel.events.selectNetwork,
  ]);

  useLayoutEffect(() => {
    selectNetwork(chainId);
  }, [chainId, selectNetwork]);

  // `useGate` (inside `useReferendum`) opens the governance flow gate from a
  // layout effect, and React runs child layout effects before the parent's — so
  // the gate is kept unmounted until the selector already reports our chain,
  // otherwise the gate would snapshot the previous network.
  const ready = selectedChainId === chainId && network !== null;

  if (!ready) {
    return <LoadingModal onClose={onClose} />;
  }

  return <ReferendumBody chainId={chainId} referendumId={referendumId} onClose={onClose} />;
};

const ReferendumBody = ({ chainId, referendumId, onClose }: Props) => {
  const referendum = useReferendum(referendumId);

  if (!referendum) {
    return <LoadingModal onClose={onClose} />;
  }

  return <GovernanceReferendumDetailsModal referendum={referendum} chainId={chainId} onClose={onClose} />;
};

const LoadingModal = ({ onClose }: { onClose: () => void }) => (
  <Modal isOpen size="md" height="fit" onToggle={(open) => !open && onClose()}>
    <Modal.Content>
      <div className="flex h-[300px] items-center justify-center">
        <Loader color="primary" size={32} />
      </div>
    </Modal.Content>
  </Modal>
);
