import { useEffect, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { FootnoteText, Loader } from '@/shared/ui';

const MESSAGE_KEYS = [
  'flexibleMultisig.editProxy.loader.fetchingMultisigs',
  'flexibleMultisig.editProxy.loader.findingConnections',
  'flexibleMultisig.editProxy.loader.planningEdit',
];

const ROTATE_MS = 1200;

export const InitializingBody = () => {
  const { t } = useI18n();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const handle = setInterval(() => {
      setIndex((i) => (i + 1) % MESSAGE_KEYS.length);
    }, ROTATE_MS);

    return () => clearInterval(handle);
  }, []);

  const messageKey = MESSAGE_KEYS[index] ?? MESSAGE_KEYS[0]!;

  return (
    <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-y-3">
      <Loader color="primary" size={32} />
      <FootnoteText className="text-text-tertiary">{t(messageKey)}</FootnoteText>
    </div>
  );
};
