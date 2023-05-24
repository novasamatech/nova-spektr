import { Disclosure } from '@headlessui/react';
import cn from 'classnames';

import { WalletGroupItem, WalletStructure } from '@renderer/components/layout/PrimaryLayout/Wallets/common/types';
import { Icon } from '@renderer/components/ui';
import { WalletType } from '@renderer/domain/shared-kernel';
import { GroupIcons, GroupLabels } from '@renderer/components/layout/PrimaryLayout/Wallets/common/constants';
import { BodyText, CaptionText, SmallTitleText } from '@renderer/components/ui-redesign';
import { useI18n } from '@renderer/context/I18nContext';
import { HelpText } from '@renderer/components/ui-redesign/Typography';
import { AccountAddress } from '@renderer/components/common';
import { AccountDS } from '@renderer/services/storage';

type Props = {
  type: WalletType;
  wallets: WalletGroupItem;
};

const WalletGroup = ({ type, wallets }: Props) => {
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
                <SmallTitleText className="text-chip-text uppercase" fontWeight="semibold">
                  {t(GroupLabels[type])}
                </SmallTitleText>
                <CaptionText className="bg-chip-icon text-button-text px-1.5 py-0.5 rounded-full">
                  {wallets.length}
                </CaptionText>
              </div>

              <Icon name="down" size={16} className={cn('text-icon-default', open && 'rotate-180')} />
            </>
          )}
        </Disclosure.Button>

        <Disclosure.Panel as="ul" className="flex flex-col gap-y-1 px-1 py-2">
          {wallets.map((wallet, index) => (
            <li key={index} className="hover:bg-action-background-hover rounded">
              <button className="w-full py-1.5 px-4 flex flex-col">
                {type === WalletType.MULTISHARD_PARITY_SIGNER ? (
                  <>
                    {/* TODO change font according to design */}
                    <BodyText fontWeight="medium" className="text-text-secondary">
                      {(wallet as WalletStructure).name}
                    </BodyText>
                    <HelpText fontWeight="medium" className="text-text-tertiary">
                      {(wallet as WalletStructure).amount}&nbsp;{t('wallets.shards')}
                    </HelpText>
                  </>
                ) : (
                  <AccountAddress
                    size={20}
                    addressFont="text-body text-text-primary font-medium"
                    name={(wallet as AccountDS).name}
                    accountId={(wallet as AccountDS).accountId}
                  />
                )}
              </button>
            </li>
          ))}
        </Disclosure.Panel>
      </Disclosure>
    </li>
  );
};

export default WalletGroup;
