import { useUnit } from 'effector-react';
import { useCallback, useState } from 'react';

import { type ChainId } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { Popover } from '@/shared/ui-kit';
import { type PathNode } from '@/domains/backend';
import { networkModel } from '@/entities/network';
import { graphModel } from '../model/graph-model';

import { PathChip } from './PathChip';
import { PathOverviewBody } from './PathOverviewBody';
import { SigningPathEditModal } from './SigningPathEditModal';
import { nodeView } from './path-views';

type Props = {
  chainId: ChainId;
  path: PathNode[];
  allowedProxyTypes?: readonly string[];
  disabledProxyReason?: string;
  onChange: (path: PathNode[]) => void;
};

export const SigningPathControl = ({ chainId, path, allowedProxyTypes, disabledProxyReason, onChange }: Props) => {
  const { t } = useI18n();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const resolveName = useUnit(graphModel.$nameResolver);
  const chains = useUnit(networkModel.$chains);
  const addressPrefix = chains[chainId]?.addressPrefix;
  const boundResolve = useCallback((accountId: AccountId) => resolveName(accountId, chainId), [resolveName, chainId]);

  // Hide for trivial paths — single signatory in a non-multisig flow needs no
  // visualization, and the legacy signatory dropdown already shows the leaf.
  if (path.length < 2) return null;

  const views = path
    .map((node, i) => nodeView(node, boundResolve, i, t, addressPrefix))
    .filter((v): v is NonNullable<typeof v> => v !== null);

  const handleSave = (next: PathNode[]) => {
    onChange(next);
    setIsModalOpen(false);
  };

  return (
    <>
      <Popover enableHover side="bottom" align="start">
        <Popover.Trigger>
          <PathChip onClick={() => setIsModalOpen(true)} />
        </Popover.Trigger>
        <Popover.Content>
          <PathOverviewBody path={path} views={views} />
        </Popover.Content>
      </Popover>

      <SigningPathEditModal
        isOpen={isModalOpen}
        chainId={chainId}
        initialPath={path}
        allowedProxyTypes={allowedProxyTypes}
        disabledProxyReason={disabledProxyReason}
        onSave={handleSave}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};
