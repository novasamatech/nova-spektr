import { type Chain, type ChainId, type VaultChainAccount, type VaultShardAccount } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { Accordion, FootnoteText, HelpText } from '@/shared/ui';
import { ChainTitle } from '@/entities/chain';
import { accountUtils } from '../../lib/account-utils';
import { DerivedAccount } from '../Cards/DerivedAccount';
import { ExplorersPopover } from '../ExplorersPopover/ExplorersPopover';

type Props = {
  chains: Chain[];
  accountsMap: Record<ChainId, (VaultChainAccount | VaultShardAccount[])[]>;
  className?: string;
  onShardClick?: (shards: VaultShardAccount[]) => void;
};

export const VaultAccountsList = ({ chains, accountsMap, className, onShardClick }: Props) => {
  const { t } = useI18n();

  return (
    <div className={cnTw('flex flex-col overflow-y-auto', className)}>
      <FootnoteText className="pl-10 text-text-tertiary">{t('accountList.addressColumn')}</FootnoteText>

      {chains.map((chain) => {
        if (!accountsMap[chain.chainId]) return;

        return (
          <Accordion key={chain.chainId} isDefaultOpen className="pl-8 pr-1">
            <Accordion.Button buttonClass="p-2">
              <div className="flex gap-x-2">
                <ChainTitle fontClass="text-text-primary" chain={chain} />
                <FootnoteText className="text-text-tertiary">{accountsMap[chain.chainId].length}</FootnoteText>
              </div>
            </Accordion.Button>
            <Accordion.Content as="ul">
              {accountsMap[chain.chainId].map((account) => {
                const isSharded = accountUtils.isAccountWithShards(account);

                return (
                  <li className="mb-2 last:mb-0" key={accountUtils.getDerivationPath(account)}>
                    <ExplorersPopover
                      address={isSharded ? account[0].accountId : account.accountId}
                      explorers={chain.explorers || []}
                      addressPrefix={chain.addressPrefix}
                      button={
                        <DerivedAccount
                          account={account}
                          addressPrefix={chain.addressPrefix}
                          showInfoButton={false}
                          onClick={isSharded ? () => onShardClick?.(account) : undefined}
                        />
                      }
                    >
                      <ExplorersPopover.Group title={t('general.explorers.derivationTitle')}>
                        <HelpText className="break-all text-text-secondary">
                          {accountUtils.getDerivationPath(account)}
                        </HelpText>
                      </ExplorersPopover.Group>
                    </ExplorersPopover>
                  </li>
                );
              })}

              <hr className="my-1 w-full border-divider" />
            </Accordion.Content>
          </Accordion>
        );
      })}
    </div>
  );
};
