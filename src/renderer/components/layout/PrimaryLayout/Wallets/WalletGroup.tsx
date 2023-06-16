import { Disclosure } from '@headlessui/react';
import cn from 'classnames';

import { WalletGroupItem, MultishardWallet } from '@renderer/components/layout/PrimaryLayout/Wallets/common/types';
import { Icon } from '@renderer/components/ui';
import { WalletType } from '@renderer/domain/shared-kernel';
import { GroupIcons, GroupLabels } from '@renderer/components/layout/PrimaryLayout/Wallets/common/constants';
import { BodyText, CaptionText } from '@renderer/components/ui-redesign';
import { useI18n } from '@renderer/context/I18nContext';
import { HelpText } from '@renderer/components/ui-redesign/Typography';
import { AccountAddress } from '@renderer/components/common';
import { Account } from '@renderer/domain/account';
import { isMultishardWalletItem } from '@renderer/components/layout/PrimaryLayout/Wallets/common/utils';

type Props = {
  type: WalletType;
  wallets: WalletGroupItem[];
  onWalletClick: (wallet: WalletGroupItem) => void;
};

const WalletGroup = ({ type, wallets, onWalletClick }: Props) => {
  const { t } = useI18n();

  if (!wallets.length) {
    return null;
  }

  return (
    <li>
      <Disclosure defaultOpen>
        <Disclosure.Button className="w-full flex justify-between items-center py-3.5 px-5">
          {({ open }) => (
            <>
              <div className="flex items-center justify-between gap-x-1.5">
                <Icon size={14} name={GroupIcons[type]} className="text-chip-icon" />
                <CaptionText className="text-chip-text uppercase">{t(GroupLabels[type])}</CaptionText>
                <CaptionText className="bg-chip-icon text-button-text px-1.5 py-0.5 h-4 rounded-full" align="center">
                  {wallets.length}
                </CaptionText>
              </div>

              <Icon name="down" size={16} className={cn('text-icon-default', open && 'rotate-180')} />
            </>
          )}
        </Disclosure.Button>

        <Disclosure.Panel as="ul" className="flex flex-col gap-y-1 px-1 py-2">
          {wallets.map((wallet, index) => {
            const isActive = isMultishardWalletItem(wallet)
              ? wallet.rootAccounts.some((a) => a.isActive)
              : wallet.isActive;

            return (
              <li
                key={index}
                className={cn('hover:bg-action-background-hover rounded', isActive && 'bg-selected-background')}
              >
                <button className="w-full py-1.5 px-4 flex flex-col" onClick={() => !isActive && onWalletClick(wallet)}>
                  {type === WalletType.MULTISHARD_PARITY_SIGNER ? (
                    <>
                      <BodyText className="text-text-secondary">{(wallet as MultishardWallet).name}</BodyText>
                      <HelpText className="text-text-tertiary">
                        {(wallet as MultishardWallet).amount}&nbsp;{t('wallets.shards')}
                      </HelpText>
                    </>
                  ) : (
                    <AccountAddress
                      size={20}
                      addressFont="text-body text-text-primary font-medium"
                      name={(wallet as Account).name}
                      accountId={(wallet as Account).accountId}
                    />
                  )}
                </button>
              </li>
            );
          })}
        </Disclosure.Panel>
      </Disclosure>
    </li>
  );
};

export default WalletGroup;
