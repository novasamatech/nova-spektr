import { PropsWithChildren, ReactNode } from 'react';

import { getAccountExplorer, toAddress, copyToClipboard } from '@shared/lib/utils';
import type { Address, Explorer, AccountId } from '@shared/core';
import { ExplorerLink, IconButton, ContextMenu, HelpText } from '@shared/ui';
import { useI18n } from '@app/providers';

type Props = {
  button: ReactNode;
  address: Address | AccountId;
  explorers?: Explorer[];
  addressPrefix?: number;
};

const ExplorersPopoverRoot = ({
  button,
  address,
  explorers = [],
  addressPrefix,
  children,
}: PropsWithChildren<Props>) => {
  const { t } = useI18n();

  const formattedAddress = toAddress(address, { prefix: addressPrefix });

  return (
    <ContextMenu button={button}>
      <ContextMenu.Group title={t('general.explorers.addressTitle')}>
        <div className="flex items-center gap-x-2">
          <HelpText className="text-text-secondary break-all">{formattedAddress}</HelpText>
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

export const ExplorersPopover = Object.assign(ExplorersPopoverRoot, {
  Group: PopoverGroup,
});
