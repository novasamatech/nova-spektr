import { type ApiPromise } from '@polkadot/api';
import { type PropsWithChildren, memo, useDeferredValue, useEffect, useState } from 'react';

import { type CallData, type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { validateCallData } from '@/shared/lib/utils';
import { Alert, Button, InputHint, SmallTitleText } from '@/shared/ui';
import { Input, Modal, useNotification } from '@/shared/ui-kit';
import { Json } from '@/shared/ui-kit/Json/Json';
import {
  type MultisigOperation,
  multisigOperation,
  multisigOperationService,
  transactionService,
} from '@/domains/network';
import { transactionService as entityTransactionService } from '@/entities/transaction';

type Props = PropsWithChildren<{
  operation: MultisigOperation;
  api: ApiPromise;
  chain: Chain;
}>;

const isCallData = (value: string): value is CallData => value.startsWith('0x');

type DecodedCall = {
  section: string;
  method: string;
};

export const CallDataModal = memo(({ operation, api, chain, children }: Props) => {
  const { t } = useI18n();
  const { toast } = useNotification();

  const [isOpen, setIsOpen] = useState(false);
  const [callData, setCallData] = useState('');
  const [decodedCall, setDecodedCall] = useState<DecodedCall | null>(null);
  const [formattedCall, setFormattedCall] = useState<object | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDecoding, setIsDecoding] = useState(false);

  const deferredCallData = useDeferredValue(callData);

  useEffect(() => {
    if (!deferredCallData) {
      setDecodedCall(null);
      setFormattedCall(null);
      setError(null);
      return;
    }

    if (!isCallData(deferredCallData)) {
      setDecodedCall(null);
      setFormattedCall(null);
      setError('operation.callData.errorInvalidHex');
      return;
    }

    if (!validateCallData(deferredCallData, operation.callHash)) {
      setDecodedCall(null);
      setFormattedCall(null);
      setError('operation.callData.errorHashMismatch');
      return;
    }

    setIsDecoding(true);
    setError(null);

    try {
      const extrinsic = transactionService.createExtrinsicFromCallData(deferredCallData, api);
      const innerCall = multisigOperationService.findInnerExtrinsicCall(extrinsic) ?? extrinsic.method;
      const human = innerCall.toHuman() as { method?: string; section?: string };

      setDecodedCall({
        section: human.section ?? extrinsic.method.section,
        method: human.method ?? extrinsic.method.method,
      });

      const call = entityTransactionService.createCallFromCallData(deferredCallData, api);
      setFormattedCall(call ? entityTransactionService.formatCall(call, chain) : null);
    } catch {
      setDecodedCall(null);
      setFormattedCall(null);
      setError('operation.callData.errorDecodeFailed');
    } finally {
      setIsDecoding(false);
    }
  }, [deferredCallData, api, chain, operation.callHash]);

  const canAdd = decodedCall !== null && !error && !isDecoding;

  const handleAdd = () => {
    if (!canAdd || !decodedCall || !isCallData(callData)) return;

    multisigOperation.updateCallData({
      chainId: operation.chainId,
      multisigAccountId: operation.multisigAccountId,
      callHash: operation.callHash,
      callData,
      transaction: {
        chainId: operation.chainId,
        accountId: operation.multisigAccountId,
        section: decodedCall.section,
        method: decodedCall.method,
        args: {},
      },
    });

    toast.success(t('operation.callData.addSuccess'));
    setIsOpen(false);
  };

  const handleToggle = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setCallData('');
      setDecodedCall(null);
      setFormattedCall(null);
      setError(null);
    }
  };

  const hasError = callData.length > 0 && error !== null;

  return (
    <Modal isOpen={isOpen} size="mdlg" height="fit" onToggle={handleToggle}>
      <Modal.Trigger>{children}</Modal.Trigger>
      <Modal.Title close>{t('operation.callData.title')}</Modal.Title>
      <Modal.Content>
        <div className="flex flex-col gap-y-4 p-5">
          <Alert active variant="info" title={t('operation.callData.hintTitle')}>
            <Alert.Item withDot={false}>{t('operation.callData.hintDescription')}</Alert.Item>
          </Alert>

          <Input
            placeholder={t('operation.callData.inputPlaceholder')}
            value={callData}
            invalid={hasError}
            onChange={setCallData}
          />

          <InputHint active={hasError} variant="error">
            {error && t(error)}
          </InputHint>

          {formattedCall && (
            <div className="flex flex-col gap-y-2">
              <SmallTitleText>{t('operation.callData.preview')}</SmallTitleText>
              <div className="max-h-[300px] overflow-auto rounded-md border border-filter-border bg-block-background p-4">
                <Json value={formattedCall} name="call" />
              </div>
            </div>
          )}

          {isDecoding && <div className="text-body text-text-tertiary">{t('operation.callData.decoding')}</div>}

          <Button className="ml-auto" disabled={!canAdd} onClick={handleAdd}>
            {t('operation.callData.addButton')}
          </Button>
        </div>
      </Modal.Content>
    </Modal>
  );
});
