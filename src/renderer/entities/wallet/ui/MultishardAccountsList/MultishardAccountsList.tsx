import { useMemo } from 'react';

import { type BaseAccount, type Chain, type ChainAccount, type ChainId } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { RootExplorers, cnTw } from '@/shared/lib/utils';
import { Accordion, FootnoteText, HelpText } from '@/shared/ui';
import { ChainTitle } from '@/entities/chain';
import { ContactItem } from '../ContactItem/ContactItem';
import { ExplorersPopover } from '../ExplorersPopover/ExplorersPopover';

type Props = {
  chains: Chain[];
  accounts: Map<BaseAccount, Record<ChainId, ChainAccount[]>>;
  className?: string;
};

export const MultishardAccountsList = ({ chains, accounts, className }: Props) => {
  const { t } = useI18n();

  const accountList = useMemo(() => {
    return [...accounts.entries()];
  }, []);

  return (
    <div className={cnTw('flex flex-col overflow-y-auto', className)}>
      {accountList.map(([baseAccount, chainMap]) => (
        <div key={baseAccount.id} className="flex flex-col pl-5">
          <ExplorersPopover
            address={baseAccount.accountId}
            explorers={RootExplorers}
            button={
              <ContactItem
                className="bg-white py-4 pr-2"
                iconSize={28}
                name={baseAccount.name}
                address={baseAccount.accountId}
              />
            }
          />

          <FootnoteText className="pl-10 text-text-tertiary">{t('accountList.addressColumn')}</FootnoteText>

          {chains.map((chain) => {
            if (!chainMap[chain.chainId]) return;

            return (
              <Accordion key={chain.chainId} isDefaultOpen className="pl-8">
                <Accordion.Button buttonClass="p-2">
                  <div className="flex gap-x-2">
                    <ChainTitle fontClass="text-text-primary" chain={chain} />
                    <FootnoteText className="text-text-tertiary">{chainMap[chain.chainId].length}</FootnoteText>
                  </div>
                </Accordion.Button>
                <Accordion.Content>
                  {chainMap[chain.chainId].map((account) => (
                    <div key={account.id} className="mb-2 flex items-center px-2 py-1.5">
                      <ExplorersPopover
                        address={account.accountId}
                        explorers={chain.explorers}
                        button={
                          <ContactItem
                            name={account.name}
                            address={account.accountId}
                            addressPrefix={chain.addressPrefix}
                          />
                        }
                      >
                        <ExplorersPopover.Group
                          active={Boolean(account.derivationPath)}
                          title={t('general.explorers.derivationTitle')}
                        >
                          <HelpText className="break-all text-text-secondary">{account.derivationPath}</HelpText>
                        </ExplorersPopover.Group>
                      </ExplorersPopover>
                    </div>
                  ))}

                  <hr className="my-1 w-full border-divider" />
                </Accordion.Content>
              </Accordion>
            );
          })}
        </div>
      ))}
    </div>
  );
};
