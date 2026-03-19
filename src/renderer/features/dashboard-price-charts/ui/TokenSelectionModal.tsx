import { useUnit } from 'effector-react';
import { useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { FootnoteText } from '@/shared/ui';
import { AssetIcon } from '@/shared/ui-entities';
import { Checkbox, Modal, SearchInput } from '@/shared/ui-kit';
import { useAvailableAssets } from '../hooks/useAvailableAssets';
import { $trackedPriceIds, tokenAdded, tokenRemoved } from '../model';

type Props = {
  onClose: () => void;
};

export const TokenSelectionModal = ({ onClose }: Props) => {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const available = useAvailableAssets();
  const trackedIds = useUnit($trackedPriceIds);

  const filtered = query
    ? available.filter(
        (a) =>
          a.symbol.toLowerCase().includes(query.toLowerCase()) || a.name.toLowerCase().includes(query.toLowerCase()),
      )
    : available;

  const handleToggle = (priceId: string, checked: boolean) => {
    if (checked) {
      tokenAdded(priceId);
    } else {
      tokenRemoved(priceId);
    }
  };

  return (
    <Modal size="sm" isOpen onToggle={(open) => !open && onClose()}>
      <Modal.Title close>{t('dashboard.priceCharts.manageTokens')}</Modal.Title>
      <Modal.Content>
        <div className="flex flex-col gap-3 px-5 py-4">
          <SearchInput
            value={query}
            placeholder={t('dashboard.priceCharts.searchPlaceholder')}
            autoFocus
            onChange={setQuery}
          />
          <div className="flex max-h-[400px] flex-col gap-1 overflow-y-auto">
            {filtered.map((asset) => (
              <Checkbox
                key={asset.priceId}
                checked={trackedIds.includes(asset.priceId)}
                onChange={(checked) => handleToggle(asset.priceId, checked)}
              >
                <div className="flex items-center gap-2">
                  <AssetIcon asset={asset} size={24} />
                  <FootnoteText className="font-semibold">{asset.symbol}</FootnoteText>
                  <FootnoteText className="text-text-tertiary">{asset.name}</FootnoteText>
                </div>
              </Checkbox>
            ))}
          </div>
        </div>
      </Modal.Content>
    </Modal>
  );
};
