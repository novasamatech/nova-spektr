import { stringify } from 'yaml';

import { Wallet } from '@shared/core';
import { MultishardMap } from '@widgets/WalletDetails/lib/types';
import { useI18n } from '@app/providers';
import { downloadFiles, exportKeysUtils } from '@features/wallets/ExportKeys';
import { DropdownIconButton } from '@/src/renderer/shared/ui';

type Props = {
  wallet: Wallet;
  accounts: MultishardMap;
};

export const MultishardDetailsActions = ({ wallet, accounts }: Props) => {
  const { t } = useI18n();

  const rootsAndAccounts = Array.from(accounts, ([root, accounts]) => ({ root, accounts }));

  const handleExport = () => {
    const downloadData = rootsAndAccounts.map(({ root, accounts }, index) => {
      const accountsFlat = Object.values(accounts).reduce((acc, chainAccounts) => {
        acc.push(...chainAccounts);

        return acc;
      }, []);
      const exportStructure = exportKeysUtils.getExportStructure(root.accountId, accountsFlat);
      const fileData = stringify(exportStructure, {
        schema: 'failsafe',
        defaultStringType: 'QUOTE_DOUBLE',
        defaultKeyType: 'PLAIN',
      });
      const blob = new Blob([fileData], { type: 'text/plain' });

      const fileName = wallet.name + (rootsAndAccounts.length > 1 ? ' ' + index : '');

      return {
        url: URL.createObjectURL(blob),
        fileName: `${fileName}.yaml`,
      };
    });

    downloadFiles(downloadData);
  };

  const options = [
    {
      id: 'export',
      icon: 'export',
      title: t('walletDetails.vault.export'),
      onClick: handleExport,
    },
  ];

  return <DropdownIconButton options={options} name="more" className="mt-2" menuClassName="right-0" />;
};
