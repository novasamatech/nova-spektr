import { Listbox, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { type TFunction } from 'react-i18next';

import { useI18n } from '@app/providers';
import type { RpcNode } from '@shared/core';
import { ConnectionType } from '@shared/core';
import { useScrollTo } from '@shared/lib/hooks';
import { cnTw } from '@shared/lib/utils';
import { Button, FootnoteText, HelpText, Icon, IconButton } from '@shared/ui';
import { OptionStyle, SelectButtonStyle } from '@shared/ui/Dropdowns/common/constants';
import { CommonInputStyles, CommonInputStylesTheme } from '@shared/ui/Inputs/common/styles';
import type { Theme } from '@shared/ui/types';
import type { ConnectionItem, SelectorPayload } from '../lib/types';

const TRANSITION_DURATION = 100;

const Title = {
  [ConnectionType.AUTO_BALANCE]: (t: TFunction) => t('settings.networks.selectorAutoBalance'),
  [ConnectionType.DISABLED]: (t: TFunction) => t('settings.networks.selectorDisableNode'),
  [ConnectionType.LIGHT_CLIENT]: (t: TFunction) => t('settings.networks.selectorLightClient'),
  [ConnectionType.RPC_NODE]: (t: TFunction, nodeName?: string) => nodeName,
};

type Props = {
  connectionList: ConnectionItem[];
  activeConnection?: ConnectionItem;
  theme?: Theme;
  onChange: (value: SelectorPayload) => void;
  onEditCustomNode: (node: RpcNode) => void;
  onRemoveCustomNode: (node: RpcNode) => void;
  onAddCustomNode: () => void;
};

export const NetworkSelector = ({
  connectionList,
  activeConnection,
  theme = 'light',
  onChange,
  onEditCustomNode,
  onRemoveCustomNode,
  onAddCustomNode,
}: Props) => {
  const { t } = useI18n();
  const [ref, scroll] = useScrollTo<HTMLDivElement>(TRANSITION_DURATION);

  return (
    <Listbox value={activeConnection || {}} onChange={onChange}>
      {({ open }) => (
        <div className="relative">
          <Listbox.Button
            className={cnTw(
              open && SelectButtonStyle[theme].open,
              SelectButtonStyle[theme].disabled,
              CommonInputStyles,
              CommonInputStylesTheme[theme],
              'w-[248px] flex items-center gap-x-2 justify-between',
            )}
            onClick={scroll}
          >
            <FootnoteText className="truncate">
              {(activeConnection && Title[activeConnection.type](t, activeConnection.node?.name)) ||
                t('settings.networks.selectorPlaceholder')}
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
            <div
              ref={ref}
              className="mt-1 absolute z-20 py-1 px-1 w-full border border-token-container-border rounded bg-input-background shadow-card-shadow"
            >
              <Listbox.Options className="max-h-64 overflow-y-auto overscroll-contain">
                {connectionList.map((data) => {
                  const { type, node, isCustom } = data;

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
                          <FootnoteText className="text-text-secondary truncate">
                            {Title[type](t, node?.name)}
                          </FootnoteText>
                          <HelpText className="text-text-tertiary truncate">{node?.url}</HelpText>
                        </div>
                        {node && isCustom && (
                          <>
                            <IconButton
                              name="edit"
                              onClick={(event) => {
                                event.stopPropagation();
                                onEditCustomNode(node);
                              }}
                            />
                            <IconButton
                              name="delete"
                              onClick={(event) => {
                                event.stopPropagation();
                                onRemoveCustomNode(node);
                              }}
                            />
                          </>
                        )}
                      </div>
                    </Listbox.Option>
                  );
                })}
              </Listbox.Options>
              <Button
                size="sm"
                variant="text"
                className="w-full h-8.5 justify-center"
                suffixElement={<Icon name="add" size={16} />}
                onClick={onAddCustomNode}
              >
                {t('settings.networks.addNodeButton')}
              </Button>
            </div>
          </Transition>
        </div>
      )}
    </Listbox>
  );
};
