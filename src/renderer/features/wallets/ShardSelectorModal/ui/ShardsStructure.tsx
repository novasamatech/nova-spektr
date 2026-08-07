import { useUnit } from 'effector-react';

import { type ChainId } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw, nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { FootnoteText, HelpText, Icon } from '@/shared/ui';
import { Accordion, Checkbox } from '@/shared/ui-kit';
import { ChainTitle } from '@/entities/chain';
import { networkModel } from '@/entities/network';
import { selectorUtils } from '../lib/selector-utils';
import { shardsUtils } from '../lib/shards-utils';
import { type ChainToggleParams } from '../lib/types';
import { shardsModel } from '../model/shards-model';

import { SelectableRoot } from './SelectableRoot';
import { SelectableShard } from './SelectableShard';

const EvmChainTitle = ({ fontClass }: { fontClass: string }) => {
  const { t } = useI18n();

  return (
    <div className="flex items-center gap-x-2">
      <Icon name="ethereum" size={16} />
      <FootnoteText as="span" className={cnTw('uppercase', fontClass)}>
        {t('walletDetails.vault.evmGroup')}
      </FootnoteText>
    </div>
  );
};

export const ShardsStructure = () => {
  const { t } = useI18n();
  const chains = useUnit(networkModel.$chains);
  const shardsStructure = useUnit(shardsModel.$shardsStructure);
  const selectedStructure = useUnit(shardsModel.$selectedStructure);

  if (nullable(shardsStructure)) return null;

  const toggleChain = (root: AccountId, chainId: ChainToggleParams['chainId'], value: boolean) => {
    shardsModel.events.chainToggled({ root, chainId, value });
  };

  const toggleAccount = (
    root: AccountId,
    chainId: ChainToggleParams['chainId'],
    accountId: AccountId,
    value: boolean,
  ) => {
    shardsModel.events.accountToggled({ root, chainId, accountId, value });
  };

  const { rootAccountId, rootAccountName, chainTuples } = shardsStructure;

  return (
    <div className="max-h-[470px]">
      <SelectableRoot
        accountId={rootAccountId}
        accountName={rootAccountName}
        checked={selectorUtils.isChecked(selectedStructure[rootAccountId]!)}
        semiChecked={selectorUtils.isSemiChecked(selectedStructure[rootAccountId]!)}
        onChange={(value) => shardsModel.events.rootToggled({ root: rootAccountId, value })}
      />

      <ul className="ml-6">
        {chainTuples.map(([chainId, accounts]) => {
          const isChecked = selectorUtils.isChecked(selectedStructure[rootAccountId]![chainId]!);
          const isSemiChecked = selectorUtils.isSemiChecked(selectedStructure[rootAccountId]![chainId]!);

          return (
            <li key={chainId} className="mt-2">
              <Accordion initialOpen>
                <Accordion.Trigger>
                  <div className="w-full" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isChecked}
                      semiChecked={isSemiChecked}
                      onChange={(checked) => toggleChain(rootAccountId, chainId, checked)}
                    >
                      <div className="flex items-center gap-2">
                        {chainId === shardsUtils.EVM_GROUP_ID ? (
                          <EvmChainTitle
                            fontClass={cnTw(isChecked || isSemiChecked ? 'text-text-primary' : 'text-text-secondary')}
                          />
                        ) : chainId === shardsUtils.UNIVERSAL_GROUP_ID ? (
                          <FootnoteText
                            className={cnTw(isChecked || isSemiChecked ? 'text-text-primary' : 'text-text-secondary')}
                          >
                            {t('walletDetails.vault.universalGroup')}
                          </FootnoteText>
                        ) : chains[chainId as ChainId] ? (
                          <ChainTitle
                            chain={chains[chainId as ChainId]!}
                            fontClass={cnTw(isChecked || isSemiChecked ? 'text-text-primary' : 'text-text-secondary')}
                          />
                        ) : null}
                        <HelpText className="text-text-tertiary">
                          {selectedStructure[rootAccountId]?.[chainId]?.checked} /{' '}
                          {selectedStructure[rootAccountId]?.[chainId]?.total}
                        </HelpText>
                      </div>
                    </Checkbox>
                  </div>
                </Accordion.Trigger>
                <Accordion.Content>
                  <div className="ml-6">
                    {accounts.map((account) => {
                      // A key with no network scope has no chain to render against.
                      const accountChain = 'chainId' in account ? chains[account.chainId] : undefined;
                      if ('chainId' in account && nullable(accountChain)) return null;

                      return (
                        <div key={account.id} className="mt-2">
                          <SelectableShard
                            account={account}
                            chain={accountChain}
                            checked={selectedStructure[rootAccountId]?.[chainId]?.accounts[account.accountId] ?? false}
                            onChange={(value) => toggleAccount(rootAccountId, chainId, account.accountId, value)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </Accordion.Content>
              </Accordion>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
