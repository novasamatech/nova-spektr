import { type PropsWithChildren, type ReactNode } from 'react';

import { type AccountId, type Address, type Explorer } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw, copyToClipboard, getAccountExplorer, toAddress } from '@/shared/lib/utils';
import { ContextMenu, ExplorerLink, HelpText, IconButton } from '@/shared/ui';

type Props = {
  button: ReactNode;
  address: Address | AccountId;
  explorers?: Explorer[];
  addressPrefix?: number;
  className?: string;
  contextClassName?: string;
};

const ExplorersPopoverRoot = ({
  button,
  address,
  explorers = [],
  addressPrefix,
  children,
  className,
  contextClassName,
}: PropsWithChildren<Props>) => {
  const { t } = useI18n();
  const formattedAddress = toAddress(address, { prefix: addressPrefix });

  return (
    <ContextMenu button={button} className={contextClassName}>
      <ContextMenu.Group title={t('general.explorers.addressTitle')}>
        <div className={cnTw('flex items-center gap-x-2', className)}>
          <HelpText className="break-all text-text-secondary">{formattedAddress}</HelpText>
          <IconButton className="shrink-0" name="copy" size={20} onClick={() => copyToClipboard(formattedAddress)} />
        </div>
      </ContextMenu.Group>
      {children}

      <ContextMenu.Group active={explorers.length > 0}>
        <ul className="flex flex-col gap-y-2">
          {explorers.map((explorer) => (
            <li key={explorer.name}>
              <ExplorerLink name={explorer.name} href={getAccountExplorer(explorer, { address: formattedAddress })} />
            </li>
          ))}
        </ul>
      </ContextMenu.Group>
    </ContextMenu>
  );
};

type GroupProps = {
  title?: string;
  active?: boolean;
};
const PopoverGroup = ({ title, active = true, children }: PropsWithChildren<GroupProps>) => {
  return (
    <ContextMenu.Group active={active} title={title}>
      {children}
    </ContextMenu.Group>
  );
};

/**
 * @deprecated Use `import { AccountExplorers, RootExplorers } from
 *   '@/shared/ui-entities'` instead.
 */
export const ExplorersPopover = Object.assign(ExplorersPopoverRoot, {
  Group: PopoverGroup,
});
