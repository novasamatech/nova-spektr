import { type PropsWithChildren, memo } from 'react';

import { type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { copyToClipboard, getAccountExplorer, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { ExplorerLink, FootnoteText, HelpText, IconButton, Separator } from '@/shared/ui';
import { Box, Popover } from '@/shared/ui-kit';
import { Hash } from '../Hash/Hash';

type Props = PropsWithChildren<{
  accountId: AccountId;
  chain: Chain;
  testId?: string;
}>;

export const AccountExplorers = memo(({ accountId, chain, children, testId }: Props) => {
  const { t } = useI18n();

  const { explorers, addressPrefix } = chain;
  const address = toAddress(accountId, { prefix: addressPrefix });

  return (
    <Popover align="end" dialog testId="AddressExplorer">
      <Popover.Trigger>
        <IconButton name="details" className="text-icon-default" testId={testId} onClick={e => e.stopPropagation()} />
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

          {explorers && explorers.length > 0 ? (
            <>
              <Separator />
              <div className="relative -mx-1.5 flex flex-col gap-2">
                {explorers.map(explorer => (
                  <ExplorerLink
                    key={explorer.name}
                    name={explorer.name}
                    href={getAccountExplorer(explorer, { address })}
                  />
                ))}
              </div>
            </>
          ) : null}
        </Box>
      </Popover.Content>
    </Popover>
  );
});
