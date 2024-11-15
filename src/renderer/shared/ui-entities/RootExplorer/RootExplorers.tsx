import { type PropsWithChildren, memo } from 'react';

import { type AccountId } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { SS58_DEFAULT_PREFIX, copyToClipboard, getAccountExplorer, toAddress } from '@/shared/lib/utils';
import { ExplorerLink, FootnoteText, HelpText, IconButton, Separator } from '@/shared/ui';
import { Box, Popover } from '@/shared/ui-kit';
import { Hash } from '../Hash/Hash';

export const EXPLORERS = [
  { name: 'Subscan', account: 'https://subscan.io/account/{address}' },
  { name: 'Sub.ID', account: 'https://sub.id/{address}' },
];

type Props = PropsWithChildren<{
  accountId: AccountId;
}>;

export const RootExplorers = memo(({ accountId, children }: Props) => {
  const { t } = useI18n();

  const address = toAddress(accountId, { prefix: SS58_DEFAULT_PREFIX });

  return (
    <Popover align="end" dialog testId="AccountExplorers">
      <Popover.Trigger>
        <IconButton name="details" className="text-icon-default" onClick={(e) => e.stopPropagation()} />
      </Popover.Trigger>
      <Popover.Content>
        <Box gap={2} padding={4} width="230px">
          <Box gap={0.5}>
            <FootnoteText className="text-text-tertiary">{t('general.explorers.addressTitle')}</FootnoteText>
            <Box direction="row" verticalAlign="center" gap={3}>
              <HelpText className="text-text-secondary">
                <Hash value={address} variant="full" />
              </HelpText>
              <IconButton className="shrink-0 text-icon-default" name="copy" onClick={() => copyToClipboard(address)} />
            </Box>
          </Box>

          {children ? (
            <>
              <Separator />
              {children}
            </>
          ) : null}

          <Separator />
          <div className="relative -mx-1.5 flex flex-col gap-2">
            {EXPLORERS.map((explorer) => (
              <ExplorerLink key={explorer.name} name={explorer.name} href={getAccountExplorer(explorer, { address })} />
            ))}
          </div>
        </Box>
      </Popover.Content>
    </Popover>
  );
});
