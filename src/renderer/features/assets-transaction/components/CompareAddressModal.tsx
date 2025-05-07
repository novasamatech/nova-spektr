import { useUnit } from 'effector-react';
import { type PropsWithChildren, useState } from 'react';

import { type Asset, type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { copyToClipboard, toAddress } from '@/shared/lib/utils';
import { Alert, Button, FootnoteText, Icon } from '@/shared/ui';
import { Address } from '@/shared/ui-entities';
import { Box, Checkbox, Label, Modal } from '@/shared/ui-kit';
import { type AnyAccount } from '@/domains/network';
import { OperationResult } from '@/entities/transaction';
import { type StatusType } from '../lib/types';
import { assetTransactionUtils } from '../lib/utils';
import { receiveModel } from '../model/receive-model';

type Props = PropsWithChildren & {
  account: AnyAccount;
  chain: Chain;
  asset: Asset;
};

export const CompareAddressModal = ({ account, chain, asset, children }: Props) => {
  const { t } = useI18n();

  const showPopup = useUnit(receiveModel.$showPopup);

  const [isOpen, closeModal] = useState(showPopup);
  const [isPopupDetails, setIsPopupDetails] = useState(true);
  const [isChecked, checked] = useState(false);
  const [statusType, setStatusType] = useState<StatusType | null>(null);

  const address = toAddress(account.accountId, { prefix: chain.addressPrefix });
  const legacyAddress = toAddress(account.accountId, { prefix: chain.addressPrefix }); // TODO: add legacy address
  const title = isPopupDetails ? 'receive.unfiedAddress.newUnifiedTitle' : 'receive.unfiedAddress.compareAddressTitle';

  const handleChecked = () => {
    checked(!isChecked);
    receiveModel.saveLegacyFormatViewed(!isChecked);
  };

  const handleCopy = (address: string, type: StatusType) => {
    copyToClipboard(address);
    setStatusType(type);
  };

  return (
    <>
      <Modal size="md" isOpen={isOpen} onToggle={closeModal}>
        <Modal.Title close>{t(title)}</Modal.Title>
        <Modal.Trigger>
          <div onClick={() => setIsPopupDetails(false)}>{children}</div>
        </Modal.Trigger>
        <Modal.Content>
          <Box padding={[4, 5]} horizontalAlign="center" gap={3}>
            <FootnoteText className="mb-3 text-text-secondary">{t('receive.unfiedAddress.description')}</FootnoteText>
            <div className="flex w-full items-center justify-between gap-2 bg-main-app-background p-3 pr-2">
              <Box gap={1}>
                <FootnoteText className="flex gap-2 text-text-secondary">
                  {t('receive.unfiedAddress.unifiedFormat')}
                  <Label variant="green">{t('receive.unfiedAddress.new')}</Label>
                </FootnoteText>
                <FootnoteText>
                  <Address showIcon={false} variant="truncate" address={address} />
                </FootnoteText>
              </Box>
              <Button variant="text" size="sm" onClick={() => handleCopy(address, 'unified')}>
                {t('receive.copy')}
              </Button>
            </div>

            <div className="flex w-full items-center justify-between gap-2 bg-main-app-background p-3 pr-2">
              <Box gap={1}>
                <FootnoteText className="text-text-secondary">{t('receive.unfiedAddress.legacyFormat')}</FootnoteText>
                <FootnoteText>
                  <Address showIcon={false} variant="truncate" address={address} />
                </FootnoteText>
              </Box>
              <Button variant="text" size="sm" onClick={() => handleCopy(legacyAddress, 'legacy')}>
                {t('receive.copy')}
              </Button>
            </div>

            <Alert active={true} variant="warn" title={t('receive.unfiedAddress.alertTitle')}>
              <Alert.Item withDot={false}>
                {t('receive.unfiedAddress.alertDescription', {
                  asset: asset.symbol,
                  assetName: asset.name,
                  network: chain.name,
                })}
              </Alert.Item>
            </Alert>

            {isPopupDetails && (
              <div className="mt-3">
                <Checkbox checked={isChecked} onChange={handleChecked}>
                  <FootnoteText className="text-text-secondary">
                    {t('receive.unfiedAddress.checkboxLabel')}
                  </FootnoteText>
                </Checkbox>
              </div>
            )}
          </Box>
        </Modal.Content>
        <Modal.Footer>
          <Button variant="fill" onClick={() => closeModal(false)}>
            {t('general.button.closeButton')}
          </Button>
        </Modal.Footer>
      </Modal>

      <OperationResult
        autoCloseTimeout={2000}
        isOpen={Boolean(statusType)}
        content={<Icon size={40} name="checkmarkOutline" className="m-4 text-icon-positive" />}
        title={t(assetTransactionUtils.getStatusTitle(statusType))}
        onClose={() => setStatusType(null)}
      />
    </>
  );
};
