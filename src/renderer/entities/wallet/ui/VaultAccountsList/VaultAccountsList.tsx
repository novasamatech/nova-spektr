import { cnTw } from '@shared/lib/utils';
import { DerivedAccount, accountUtils, ExplorersPopover } from '@entities/wallet';
import { useI18n } from '@app/providers';
import { FootnoteText, Accordion } from '@shared/ui';
import { ChainTitle } from '@entities/chain';
import type { Chain, ChainId, ChainAccount, ShardAccount } from '@shared/core';

type Props = {
  chains: Chain[];
  accountsMap: Record<ChainId, Array<ChainAccount | ShardAccount[]>>;
  className?: string;
  onShardClick?: (shards: ShardAccount[]) => void;
};

export const VaultAccountsList = ({ chains, accountsMap, className, onShardClick }: Props) => {
  const { t } = useI18n();

  return (
    <div className={cnTw('flex flex-col overflow-y-auto', className)}>
      <FootnoteText className="pl-10 text-text-tertiary">{t('accountList.addressColumn')}</FootnoteText>

      {chains.map((chain) => {
        if (!accountsMap[chain.chainId]) return;

        return (
          <Accordion key={chain.chainId} isDefaultOpen className="pl-10">
            <Accordion.Button buttonClass="py-2">
              <ChainTitle fontClass="text-text-primary" chain={chain} />
            </Accordion.Button>
            <Accordion.Content as="ul">
              {accountsMap[chain.chainId].map((account) => {
                const isSharded = accountUtils.isAccountWithShards(account);

                return (
                  <li className="mb-2 last:mb-0" key={accountUtils.getDerivationPath(account)}>
                    <ExplorersPopover
                      address={isSharded ? account[0].accountId : account.accountId}
                      explorers={chain.explorers || []}
                      button={
                        <DerivedAccount
                          account={account}
                          addressPrefix={chain.addressPrefix}
                          onClick={isSharded ? () => onShardClick?.(account) : undefined}
                        />
                      }
                    >
                      <ExplorersPopover.Group title="Derivation path">
                        <FootnoteText className="text-text-secondary break-all">
                          {accountUtils.getDerivationPath(account)}
                        </FootnoteText>
                      </ExplorersPopover.Group>
                    </ExplorersPopover>
                  </li>
                );
              })}

              <hr className="border-divider my-1 w-full" />
            </Accordion.Content>
          </Accordion>
        );
      })}
    </div>
  );
};
