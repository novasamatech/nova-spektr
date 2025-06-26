import { Handle, Position, useNodeConnections } from '@xyflow/react';
import { useUnit } from 'effector-react';
import { memo, useMemo } from 'react';

import { useTransformer } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { cnTw, toAddress } from '@/shared/lib/utils';
import { LabelText, SmallTitleText } from '@/shared/ui/Typography';
import { Address } from '@/shared/ui-entities/Address/Address';
import { type AccountNode, identity } from '@/domains/network';
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
  const connections = useNodeConnections();
  const hasIncoming = useMemo(() => connections.some((conn) => conn.target === id), [connections, id]);
  const hasOutgoing = useMemo(() => connections.some((conn) => conn.source === id), [connections, id]);

  const config = useTransformer(accountNodeConfigTransformer, { account: data.node.account, translation: t });

  const accountIdentity = chain ? identities[chain.chainId]?.[data.node.account.accountId] : undefined;
  const shouldFade = highlightedNodesIds ? !highlightedNodesIds.has(data.node.account.id) : false;

  return (
    <>
      {/* show on hover */}
      {/*<NodeToolbar isVisible={true} position={Position.Top}>*/}
      {/*  toolbar*/}
      {/*</NodeToolbar>*/}

      <div
        className="flex cursor-pointer overflow-hidden rounded-md bg-white shadow-md"
        style={{
          opacity: shouldFade ? 0.2 : 1,
          transition: 'opacity 300ms',
        }}
        onMouseEnter={() => !config?.disabled && accountsStructureModel.enterAccountNode(data.node)}
        onMouseLeave={() => !config?.disabled && accountsStructureModel.leaveAccountNode()}
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
                title={data.node.account.name ?? accountIdentity?.name}
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
