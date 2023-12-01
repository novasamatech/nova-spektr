import { PropsWithChildren, ReactNode } from 'react';

import { getAccountExplorer, toAddress, copyToClipboard } from '@shared/lib/utils';
import type { Address, Explorer, AccountId } from '@shared/core';
import { ExplorerLink, FootnoteText, IconButton, ContextMenu } from '@shared/ui';
import { useI18n } from '@app/providers';

type Props = {
  button: ReactNode;
  address: Address | AccountId;
  explorers: Explorer[];
  addressPrefix?: number;
};

export const ExplorersPopover = ({ button, address, explorers, addressPrefix, children }: PropsWithChildren<Props>) => {
  const { t } = useI18n();

  const formattedAddress = toAddress(address, { prefix: addressPrefix });

  return (
    <ContextMenu button={button}>
      <ContextMenu.Group title={t('general.explorers.addressTitle')}>
        <div className="flex items-center gap-x-2">
          <FootnoteText className="text-text-secondary break-all">{formattedAddress}</FootnoteText>
          <IconButton className="shrink-0" name="copy" size={20} onClick={() => copyToClipboard(formattedAddress)} />
        </div>
      </ContextMenu.Group>
      {children}

      <ContextMenu.Group active={explorers.length > 0}>
        {explorers.map((explorer) => (
          <ExplorerLink
            key={explorer.name}
            name={explorer.name}
            href={getAccountExplorer(explorer, { address: formattedAddress })}
          />
        ))}
      </ContextMenu.Group>
    </ContextMenu>
  );
};

type GroupProps = {
  title?: string;
};
const PopoverGroup = ({ title, children }: PropsWithChildren<GroupProps>) => {
  return <ContextMenu.Group title={title}>{children}</ContextMenu.Group>;
};

ExplorersPopover.Group = PopoverGroup;
