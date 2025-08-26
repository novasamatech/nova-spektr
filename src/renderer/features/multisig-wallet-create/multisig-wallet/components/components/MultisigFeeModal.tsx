import { useUnit } from 'effector-react';
import { type PropsWithChildren, memo, useEffect, useMemo, useState } from 'react';

import { type Asset, type Chain, type ChainId } from '@/shared/core';
import { useForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import { performSearch } from '@/shared/lib/utils/search';
import { Button, EmptyListWithIcon, FootnoteText, HelpText, LabelHelpBox } from '@/shared/ui';
import { RadioGroup } from '@/shared/ui/RadioGroup/RadioGroup';
import { AssetBalance, AssetIcon } from '@/shared/ui-entities';
import { Box, Modal, Popover, SearchInput, Skeleton } from '@/shared/ui-kit';
import { Fee } from '@/entities/transaction';
import { chainSelectorModel } from '../../model/chain-model';
import { formModel } from '../../model/form-model';

export const MultisigFeeModal = memo(({ children }: PropsWithChildren) => {
  const { t } = useI18n();
  const {
    fields: { chainId },
  } = useForm(formModel.form);

  const [search, setSearch] = useState('');
  const [isOpen, setToggle] = useState(false);
  const [selectedChainId, setSelectedChainId] = useState<ChainId>(chainId.value);

  useEffect(() => {
    setSelectedChainId(chainId.value);
  }, [chainId.value]);

  const handleApply = () => {
    formModel.form.fields.chainId.change(selectedChainId);
    setToggle(false);
  };

  return (
    <Modal size="md" height="full" isOpen={isOpen} onToggle={setToggle}>
      <Modal.Trigger>{children}</Modal.Trigger>
      <Modal.Title close>{t('createMultisigAccount.networkSelect.feeTitle')}</Modal.Title>
      <Modal.Content>
        <Box padding={[4, 5]} gap={4}>
          <Popover>
            <Popover.Trigger>
              <div>
                <LabelHelpBox>{t('createMultisigAccount.networkSelect.feeLabel')}</LabelHelpBox>
              </div>
            </Popover.Trigger>
            <Popover.Content>
              <div className="flex w-[360px] flex-col p-4 text-text-secondary">
                {t('createMultisigAccount.networkSelect.feeDescription')}
              </div>
            </Popover.Content>
          </Popover>

          <SearchInput value={search} placeholder="Search" onChange={setSearch} />
          <ChainsList search={search} selectedChainId={selectedChainId} onChange={setSelectedChainId} />
        </Box>
      </Modal.Content>
      <Modal.Footer>
        <Button disabled={!selectedChainId} onClick={handleApply}>
          {t('general.button.applyButton')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
});

type ChainsListProps = {
  search: string;
  selectedChainId?: string;
  onChange: (chainId: ChainId) => void;
};

const ChainsList = ({ search, selectedChainId, onChange }: ChainsListProps) => {
  const { t } = useI18n();

  const availableChains = useUnit(chainSelectorModel.$availableChains);
  const unavailableChains = useUnit(chainSelectorModel.$unavailableChains);
  const isLoading = useUnit(chainSelectorModel.$isLoading);
  const multisigChains = useUnit(chainSelectorModel.$multisigChains);

  const filteredAvailableChains = useMemo(
    () =>
      performSearch({
        records: availableChains,
        getMeta: item => ({
          symbol: item.asset.symbol,
          name: item.chain.name,
        }),
        query: search,
        weights: { symbol: 1, name: 0.8 },
      }),
    [availableChains, search],
  );

  const filteredUnavailableChains = useMemo(
    () =>
      performSearch({
        records: unavailableChains,
        getMeta: item => ({
          symbol: item.asset.symbol,
          name: item.chain.name,
        }),
        query: search,
        weights: { symbol: 1, name: 0.8 },
      }),
    [unavailableChains, search],
  );

  const availableRadioOptions = filteredAvailableChains.map(item => ({
    id: item.chain.chainId,
    value: item,
    title: `${item.asset.symbol} (${item.chain.name})`,
  }));

  const unavailableRadioOptions = filteredUnavailableChains.map(item => ({
    id: item.chain.chainId,
    value: item,
    title: `${item.asset.symbol} (${item.chain.name})`,
  }));

  if (filteredAvailableChains.length === 0 && filteredUnavailableChains.length === 0) {
    if (isLoading) {
      return (
        <>
          {multisigChains.map(chain => (
            <Box key={chain.chainId} direction="row" horizontalAlign="space-between" gap={2}>
              <Skeleton width={100} height={5} />
              <Skeleton width={50} height={5} />
            </Box>
          ))}
        </>
      );
    }

    return (
      <EmptyListWithIcon
        title={t('createMultisigAccount.networkSelect.emptySearch')}
        message={t('createMultisigAccount.networkSelect.emptySearchDescription')}
      />
    );
  }

  return (
    <>
      {filteredAvailableChains.length > 0 && (
        <Box gap={2}>
          <div className="flex items-center justify-between">
            <FootnoteText className="text-text-tertiary">
              {t('createMultisigAccount.networkSelect.availableNetwork')}
            </FootnoteText>
            <FootnoteText className="text-text-tertiary">
              {t('createMultisigAccount.networkSelect.networkFee')}
            </FootnoteText>
          </div>
          <RadioGroup
            options={availableRadioOptions}
            activeId={selectedChainId ?? ''}
            onChange={option => onChange(option.id as ChainId)}
          >
            {availableRadioOptions.map(option => (
              <RadioGroup.Select key={option.id} option={option}>
                <TokenWithFee {...option.value} key={option.id} />
              </RadioGroup.Select>
            ))}
          </RadioGroup>
        </Box>
      )}

      {filteredUnavailableChains.length > 0 && (
        <Box gap={2}>
          <div className="flex items-center justify-between">
            <FootnoteText className="text-text-tertiary">
              {t('createMultisigAccount.networkSelect.unavailableNetwork')}
            </FootnoteText>
            <FootnoteText className="text-text-tertiary">
              {t('createMultisigAccount.networkSelect.networkFee')}
            </FootnoteText>
          </div>
          <RadioGroup options={unavailableRadioOptions} activeId={selectedChainId ?? ''}>
            {unavailableRadioOptions.map(option => (
              <RadioGroup.Select key={option.id} option={option} disabled>
                <TokenWithFee {...option.value} />
              </RadioGroup.Select>
            ))}
          </RadioGroup>
        </Box>
      )}
    </>
  );
};

type ChainWithFeeAndBalance = {
  chain: Chain;
  fee: string;
  balance: string;
  asset: Asset;
};
const TokenWithFee = ({ chain, fee, asset, balance }: ChainWithFeeAndBalance) => {
  const { t } = useI18n();
  const isLoading = useUnit(chainSelectorModel.$isLoading);

  return (
    <Box
      key={chain.chainId}
      direction="row"
      width="100%"
      gap={1}
      horizontalAlign="space-between"
      verticalAlign="items-center"
    >
      <Box direction="row" gap={1} verticalAlign="center">
        <AssetIcon asset={asset} size={32} />
        <div className="flex flex-col gap-y-0.5">
          <FootnoteText className="text-text-tertiary">
            {asset.symbol} ({chain.name})
          </FootnoteText>
          <div className="flex items-center gap-x-0.5">
            <HelpText className="text-text-tertiary">{t('createMultisigAccount.networkSelect.available')}</HelpText>

            <AssetBalance
              value={balance}
              asset={asset}
              showSymbol={false}
              className="text-help-text text-text-tertiary"
            />
          </div>
        </div>
      </Box>
      <Fee fee={fee} asset={asset} showSymbol={false} isLoading={isLoading} />
    </Box>
  );
};
