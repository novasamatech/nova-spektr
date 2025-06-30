import { Handle, Position, useNodeConnections } from '@xyflow/react';
import { useUnit } from 'effector-react';
import { type MouseEvent, memo, useMemo, useRef } from 'react';

import { useTransformer } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { cnTw, toAddress } from '@/shared/lib/utils';
import { LabelText, SmallTitleText } from '@/shared/ui/Typography';
import { Address } from '@/shared/ui-entities/Address/Address';
import { type AccountNode, identity, identityService } from '@/domains/network';
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
  const identities = useUnit(identity.$list);
  const chain = useUnit(accountsStructureModel.$selectedChain);
  const heldAccountNode = useUnit(accountsStructureModel.$heldAccountNode);
  const connections = useNodeConnections();
  const hasIncoming = useMemo(() => connections.some((conn) => conn.target === id), [connections, id]);
  const hasOutgoing = useMemo(() => connections.some((conn) => conn.source === id), [connections, id]);
  const title = useMemo(() => {
    if (data.node.account.name) {
      return data.node.account.name;
    }

    const accountIdentity = chain ? identities[chain.chainId]?.[data.node.account.accountId] : undefined;
    return accountIdentity ? identityService.getFullName(accountIdentity) : '';
  }, [identities, chain, data.node.account]);

  const config = useTransformer(accountNodeConfigTransformer, { account: data.node.account, t });  const shouldFade = highlightedNodesIds ? !highlightedNodesIds.has(data.node.account.accountId) : false;

  const nodeRef = useRef<HTMLDivElement>(null);

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

    if (heldAccountNode?.account.accountId === data.node.account.accountId) {
      accountsStructureModel.releaseAccountNode();
    } else {
      accountsStructureModel.holdAccountNode(data.node);
    }
  };

  return (
    <>
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
        <div className="w-1" style={{ background: config?.color ?? 'transparent' }} />
        <div className="w-[250px]">
          {hasIncoming && <Handle type="target" position={Position.Left} className="opacity-0" />}

          <div className="flex flex-col">
            <div
              className="border-stroke flex items-center justify-between border-b px-4 py-2"
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

          {hasOutgoing && <Handle type="source" position={Position.Right} className="opacity-0" />}
        </div>
      </div>
    </>
  );
});
