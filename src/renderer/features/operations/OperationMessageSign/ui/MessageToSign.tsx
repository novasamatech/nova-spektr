import { useMemo } from 'react';

import { useI18n } from '@/shared/i18n';
import { FootnoteText } from '@/shared/ui';
import { getMessageText } from '../lib/message-text';

type Props = {
  message: Uint8Array;
};

/**
 * The complete message handed to the signer, character for character (wrapper
 * tags included) and with its line breaks.
 */
export const MessageToSign = ({ message }: Props) => {
  const { t } = useI18n();
  const text = useMemo(() => getMessageText(message), [message]);

  return (
    <div className="flex w-full flex-col gap-y-1">
      <FootnoteText className="text-text-tertiary">{t('signing.messageToSignLabel')}</FootnoteText>
      <pre
        data-testid="message-to-sign"
        className="rounded bg-main-app-background px-2 py-1.5 font-mono text-[11px] leading-relaxed break-all whitespace-pre-wrap text-text-secondary"
      >
        {text}
      </pre>
    </div>
  );
};
