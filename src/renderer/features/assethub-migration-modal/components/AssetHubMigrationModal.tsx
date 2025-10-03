import { useUnit } from 'effector-react';

import { type ChainId } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { RelayChains } from '@/shared/lib/utils/constants';
import { Button } from '@/shared/ui/Buttons';
import { InfoLink } from '@/shared/ui/InfoLink/InfoLink';
import { FootnoteText, HeaderTitleText, SmallTitleText } from '@/shared/ui/Typography';
import { ChainIcon } from '@/shared/ui-entities';
import { Box, Modal } from '@/shared/ui-kit';
import { networkModel } from '@/entities/network';
import { RELAY_TO_ASSET_HUB_CHAIN_IDS } from '../model/constants';
import { migrationModalModel } from '../model/migrationModalModel';

const getChainName = (chainId: ChainId): string | null => {
  if (chainId === RelayChains.POLKADOT) return 'polkadot';
  if (chainId === RelayChains.KUSAMA) return 'kusama';
  throw new Error(`Unknown chain ID: ${chainId}`);
};

const getContent = (t: ReturnType<typeof useI18n>['t'], chainId: ChainId) => {
  const chainName = getChainName(chainId);
  return {
    title: t(`assethubMigration.title.${chainName}AssetHub`),
    description: t(`assethubMigration.${chainName}.description`),
    bullets: [
      t(`assethubMigration.${chainName}.bullets.minimalBalance`),
      t(`assethubMigration.${chainName}.bullets.lowerFees`),
      t(`assethubMigration.${chainName}.bullets.moreTokens`),
      t(`assethubMigration.${chainName}.bullets.unifiedAccess`),
      t('assethubMigration.bullets.feePayment'),
    ],
  };
};

export const AssetHubMigrationModal = () => {
  const { t } = useI18n();

  const isModalOpen = useUnit(migrationModalModel.$isModalOpen);
  const closeModal = useUnit(migrationModalModel.closeModal);
  const chainId = useUnit(migrationModalModel.$chainId);
  const chains = useUnit(networkModel.$chains);

  const currentContent = getContent(t, chainId);
  const assetHubChainId = RELAY_TO_ASSET_HUB_CHAIN_IDS[chainId];
  const assetHubChain = chains[assetHubChainId];

  return (
    <Modal isOpen={isModalOpen} size="fit" preventOutsideClick onToggle={(open) => !open && closeModal()}>
      <Modal.Title close>
        <Box direction="row" gap={1.5} verticalAlign="center">
          <HeaderTitleText>{t('assethubMigration.title.migratedTo')}</HeaderTitleText>
          {assetHubChain && <ChainIcon chain={assetHubChain} size={20} />}
          <HeaderTitleText>{currentContent.title}</HeaderTitleText>
        </Box>
      </Modal.Title>
      <Modal.Content>
        <div className="mt-4 mb-4 w-[440px]">
          <Box direction="column" gap={6} padding={[0, 5, 0, 5]}>
            <Box direction="column" gap={4}>
              <SmallTitleText>{currentContent.description}</SmallTitleText>

              <Box direction="column" gap={2}>
                <SmallTitleText>{t('assethubMigration.bullets.title')}</SmallTitleText>
                <Box direction="column" gap={2}>
                  {currentContent.bullets.map((bullet) => (
                    <Box key={bullet} direction="row" gap={1.5} verticalAlign="start">
                      <div className="flex h-[18px] w-1 flex-shrink-0 items-center justify-center">
                        <span className="text-[12px] text-text-primary">•</span>
                      </div>
                      <FootnoteText className="flex-1">{bullet}</FootnoteText>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>

            <Box direction="row" gap={2} verticalAlign="center">
              <FootnoteText className="text-text-secondary">{t('assethubMigration.automaticMigration')}</FootnoteText>
              <InfoLink
                url="https://support.polkadot.network/support/solutions/articles/65000190561"
                size="sm"
                iconName="link"
                iconPosition="right"
                className="font-semibold"
              >
                {t('assethubMigration.learnMore')}
              </InfoLink>
            </Box>
          </Box>
        </div>
      </Modal.Content>
      <Modal.Footer>
        <Button variant="fill" pallet="primary" size="md" onClick={closeModal}>
          {t('assethubMigration.gotIt')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
