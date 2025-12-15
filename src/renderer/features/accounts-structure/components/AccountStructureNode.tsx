import { Handle, Position, useNodeConnections } from '@xyflow/react';
import { useUnit } from 'effector-react';
import { type MouseEvent, memo, useMemo, useRef, useState } from 'react';

import { useTransformer } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { cnTw, toAddress } from '@/shared/lib/utils';
import { LabelText, SmallTitleText } from '@/shared/ui/Typography';
import { Address } from '@/shared/ui-entities/Address/Address';
import { AsyncItem, useIntersectionObserver } from '@/shared/ui-kit';
import { type AccountNode, useAccountName } from '@/domains/network';
import { walletModel, walletUtils } from '@/entities/wallet';
import { accountNodeConfigTransformer } from '@/sdk/account';
import { accountsStructureModel } from '../model/accountsStructureModel';

type AccountStructureNodeProps = {
  data: {
    node: AccountNode;
    isSelected: boolean;
  };
  id: string;
};

export const AccountStructureNode = memo(({ data, id }: AccountStructureNodeProps) => {
  const { t } = useI18n();
  const highlightedNodesIds = useUnit(accountsStructureModel.$highlightedNodesIds);
  const chain = useUnit(accountsStructureModel.$selectedChain);
  const heldAccountNode = useUnit(accountsStructureModel.$heldAccountNode);
  const wallets = useUnit(walletModel.$wallets);

  const [isIntersecting, setIsIntersecting] = useState(true);

  const connections = useNodeConnections();
  const hasIncoming = useMemo(() => connections.some((conn) => conn.target === id), [connections, id]);
  const hasOutgoing = useMemo(() => connections.some((conn) => conn.source === id), [connections, id]);
  const title = useAccountName({
    accountId: data.node.account.accountId,
    chain,
  });

  const wallet = walletUtils.getWalletById(wallets, data.node.account.walletId);
  const config = useTransformer(accountNodeConfigTransformer, { account: data.node.account, wallet: wallet, t });
  const shouldFade = highlightedNodesIds ? !highlightedNodesIds.has(data.node.account.id) : false;

  const nodeRef = useRef<HTMLDivElement>(null);
  const intersectionRef = useRef<HTMLDivElement>(null);
  useIntersectionObserver(intersectionRef.current, (entry) => setIsIntersecting(entry.isIntersecting));

  const handleMouseEnter = () => {
    if (!config?.disabled && !heldAccountNode) {
      accountsStructureModel.enterAccountNode(data.node);
    }
  };
  const handleMouseLeave = () => {
    if (!config?.disabled && !heldAccountNode) {
      accountsStructureModel.leaveAccountNode();
    }
  };

  const handleClick = (e: MouseEvent) => {
    if (config?.disabled) return;

    e.stopPropagation();

    if (heldAccountNode?.account.id === data.node.account.id) {
      accountsStructureModel.releaseAccountNode();
    } else {
      accountsStructureModel.holdAccountNode(data.node);
    }
  };

  return (
    <div ref={intersectionRef}>
      {/* show on hover */}
      {/*<NodeToolbar isVisible={true} position={Position.Top}>*/}
      {/*  toolbar*/}
      {/*</NodeToolbar>*/}

      <div
        ref={nodeRef}
        className="flex cursor-pointer overflow-hidden rounded-md bg-white shadow-md"
        style={{
          opacity: shouldFade ? 0.2 : 1,
          transition: 'opacity 300ms',
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        <div className="w-1" style={{ background: config?.background ?? config?.color ?? 'transparent' }} />
        <div className="min-h-[90px] w-[250px]">
          {hasIncoming && <Handle type="target" position={Position.Left} className="opacity-0" />}

          {isIntersecting && (
            <AsyncItem>
              <div className="flex flex-col">
                <div
                  className="flex items-center justify-between border-b border-divider px-4 py-2"
                  style={{ background: data.isSelected ? config?.color : 'transparent' }}
                >
                  <SmallTitleText className={data.isSelected ? 'text-white' : 'text-text-secondary'}>
                    {config?.title}
                  </SmallTitleText>

                  {config?.subTitle && (
                    <LabelText className={cnTw('font-medium', data.isSelected ? 'text-white' : 'text-text-secondary')}>
                      {config?.subTitle}
                    </LabelText>
                  )}
                </div>
                <div className="flex min-h-[56px] px-4 py-2 align-middle text-sm text-text-secondary">
                  <Address
                    address={toAddress(data.node.account.accountId, { prefix: chain?.addressPrefix })}
                    title={title}
                    variant="short"
                    showIcon
                    iconSize={24}
                  />
                </div>
              </div>
            </AsyncItem>
          )}

          {hasOutgoing && <Handle type="source" position={Position.Right} className="opacity-0" />}
        </div>
      </div>
    </div>
  );
});
