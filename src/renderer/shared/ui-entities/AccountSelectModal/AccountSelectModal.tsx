import { type BN } from '@polkadot/util';
import { type ReactNode } from 'react';

import { type Account, type Asset, type Chain } from '@/shared/core';
import { cnTw, formatBalance, toAddress } from '@/shared/lib/utils';
import { BodyText, Icon } from '@/shared/ui';
import { Box, Modal } from '@/shared/ui-kit';
import { AccountExplorers } from '../AccountExplorers/AccountExplorers';
import { Address } from '../Address/Address';

type AccountOption = { account: Account; balance?: BN; title?: string };

type Props = {
  isOpen: boolean;
  closeButton?: boolean;
  title: ReactNode;
  chain: Chain;
  asset: Asset;
  options: AccountOption[];
  onToggle: (open: boolean) => void;
  onSelect: (account: Account) => void;
};

export const AccountSelectModal = ({
  isOpen,
  title,
  asset,
  chain,
  options,
  closeButton,
  onSelect,
  onToggle,
}: Props) => {
  return (
    <Modal isOpen={isOpen} size="sm" onToggle={onToggle}>
      <Modal.Title close={closeButton}>{title}</Modal.Title>
      <Modal.Content>
        <Box padding={[2, 3, 3]}>
          {options.map(({ account, title, balance }) => (
            <AccountItem
              key={account.accountId}
              balance={balance}
              asset={asset}
              chain={chain}
              account={account}
              title={title ?? account.name}
              onSelect={onSelect}
            />
          ))}
        </Box>
      </Modal.Content>
    </Modal>
  );
};

type ItemProps = {
  account: Account;
  title?: string;
  balance?: BN;
  asset: Asset;
  chain: Chain;
  onSelect: (value: Account) => void;
};

const AccountItem = ({ asset, account, chain, title, balance, onSelect }: ItemProps) => {
  const address = toAddress(account.accountId, { prefix: chain.addressPrefix });

  return (
    <button
      className="group flex w-full cursor-pointer items-center gap-2 overflow-hidden rounded px-2 py-1.5 text-left text-body text-text-secondary hover:bg-action-background-hover hover:text-text-primary"
      onClick={() => onSelect(account)}
    >
      <div className="w-full min-w-0 shrink truncate">
        <Address title={title} address={address} showIcon variant="truncate" />
      </div>
      <AccountExplorers accountId={account.accountId} chain={chain} />
      {balance && asset && (
        <BodyText className="shrink-0 whitespace-nowrap text-inherit">
          {formatBalance(balance, asset.precision).formatted} {asset.symbol}
        </BodyText>
      )}
      <Icon name="right" className={cnTw('group-hover:text-icon-active', !balance && 'ml-auto')} size={16} />
    </button>
  );
};
