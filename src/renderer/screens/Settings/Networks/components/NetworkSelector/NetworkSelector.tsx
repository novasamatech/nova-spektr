import { Listbox, Transition } from '@headlessui/react';
import { useState, Fragment, useEffect } from 'react';

import { cnTw } from '@renderer/shared/lib/utils';
import { Icon, FootnoteText, IconButton, Button, HelpText } from '@renderer/shared/ui';
import { useI18n } from '@renderer/app/providers';
import { RpcNode } from '@renderer/entities/chain/model/chain';
import { ConnectionType } from '@renderer/domain/connection';
import { ExtendedChain } from '@renderer/entities/network/lib/common/types';
import { SelectButtonStyle, OptionStyle } from '@renderer/shared/ui/Dropdowns/common/constants';
import { useScrollTo } from '@renderer/shared/lib/hooks';
import CommonInputStyles from '@renderer/shared/ui/Inputs/common/styles';

export const OptionsContainerStyle =
  'mt-1 absolute z-20 py-1 px-1 w-full border border-token-container-border rounded bg-input-background shadow-card-shadow';

const TRANSITION_DURATION = 100;

type SelectorPayload = {
  type: ConnectionType;
  title?: string;
  node?: RpcNode;
};

type Props = {
  networkItem: ExtendedChain;
  onDisconnect: () => void;
  onConnect: (type: ConnectionType, node?: RpcNode) => void;
  onRemoveCustomNode: (node: RpcNode) => void;
  onChangeCustomNode: (node?: RpcNode) => void;
};

export const NetworkSelector = ({
  networkItem,
  onDisconnect,
  onConnect,
  onRemoveCustomNode,
  onChangeCustomNode,
}: Props) => {
  const { t } = useI18n();
  const [ref, scroll] = useScrollTo<HTMLDivElement>(TRANSITION_DURATION);

  const { connection, nodes } = networkItem;
  const { canUseLightClient, connectionType, activeNode, customNodes } = connection;

  const [selectedNode, setSelectedNode] = useState<SelectorPayload>();
  const [availableNodes, setAvailableNodes] = useState<SelectorPayload[]>([]);

  useEffect(() => {
    const actionNodes = canUseLightClient
      ? [{ type: ConnectionType.LIGHT_CLIENT, title: t('settings.networks.selectorLightClient') }]
      : [];
    actionNodes.push({ type: ConnectionType.AUTO_BALANCE, title: t('settings.networks.selectorAutoBalance') });
    actionNodes.push({ type: ConnectionType.DISABLED, title: t('settings.networks.selectorDisableNode') });

    const networkNodes = nodes.concat(customNodes || []).map((node) => ({ type: ConnectionType.RPC_NODE, node }));

    const Predicates: Record<ConnectionType, (n: SelectorPayload) => boolean> = {
      [ConnectionType.LIGHT_CLIENT]: (data) => data.type === ConnectionType.LIGHT_CLIENT,
      [ConnectionType.AUTO_BALANCE]: (data) => data.type === ConnectionType.AUTO_BALANCE,
      [ConnectionType.DISABLED]: (data) => data.type === ConnectionType.DISABLED,
      [ConnectionType.RPC_NODE]: (data) => data.node?.url === activeNode?.url,
    };

    const allNodes = [...actionNodes, ...networkNodes];
    setAvailableNodes(allNodes);
    setSelectedNode(allNodes.find(Predicates[connectionType]));
  }, [networkItem]);

  const changeConnection = async (payload?: SelectorPayload) => {
    if (!payload) {
      onChangeCustomNode();
    } else if (payload.type === ConnectionType.DISABLED) {
      onDisconnect();
    } else {
      onConnect(payload.type, payload.node);
    }
  };

  const isCustomNode = (url: string): boolean => {
    if (!customNodes) return false;

    return customNodes.some((node) => node.url === url);
  };

  return (
    <Listbox value={selectedNode || {}} onChange={changeConnection}>
      {({ open }) => (
        <div className="relative">
          <Listbox.Button
            className={cnTw(
              open && SelectButtonStyle.open,
              SelectButtonStyle.disabled,
              CommonInputStyles,
              'w-[248px] flex items-center gap-x-2 justify-between',
            )}
            onClick={scroll}
          >
            <FootnoteText className="truncate">
              {selectedNode?.node?.name || selectedNode?.title || t('settings.networks.selectorPlaceholder')}
            </FootnoteText>
            <Icon name="down" size={16} />
          </Listbox.Button>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-150"
            enterFrom="opacity-0 translate-y-0"
            enterTo="opacity-100 translate-y-1"
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100 translate-y-1"
            leaveTo="opacity-0 translate-y-0"
          >
            <div ref={ref} className={OptionsContainerStyle}>
              <Listbox.Options className="max-h-64 overflow-y-auto overscroll-contain">
                {availableNodes.map((data) => {
                  const { type, node, title } = data;

                  return (
                    <Listbox.Option
                      key={node ? `${node.name}_${node.url}` : type}
                      value={data}
                      className={cnTw(
                        OptionStyle,
                        'ui-selected:bg-selected-background ui-active:bg-action-background-hover mb-1 last:mb-0',
                      )}
                    >
                      <div className="flex items-center gap-x-4">
                        <div className="flex flex-col justify-center overflow-hidden flex-1 h-8 pr-1">
                          <FootnoteText className="text-text-secondary truncate">{node?.name || title}</FootnoteText>
                          {node?.url && <HelpText className="text-text-tertiary truncate">{node.url}</HelpText>}
                        </div>
                        {node && isCustomNode(node.url) && (
                          <>
                            <IconButton
                              name="edit"
                              onClick={(event) => {
                                event.stopPropagation();
                                onChangeCustomNode(node);
                              }}
                            />
                            {activeNode?.url !== node.url && (
                              <IconButton
                                name="delete"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onRemoveCustomNode(node);
                                }}
                              />
                            )}
                          </>
                        )}
                      </div>
                    </Listbox.Option>
                  );
                })}
              </Listbox.Options>
              <Listbox.Option as="div" value={null} className="h-8.5">
                <Button
                  size="sm"
                  variant="text"
                  className="w-full h-full justify-center"
                  suffixElement={<Icon name="add" size={16} />}
                >
                  {t('settings.networks.addNodeButton')}
                </Button>
              </Listbox.Option>
            </div>
          </Transition>
        </div>
      )}
    </Listbox>
  );
};
