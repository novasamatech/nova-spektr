import { type ApiPromise } from '@polkadot/api';
import { useMemo } from 'react';

import { type ChainId } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { isHex } from '@/shared/lib/utils';
import { Button, FootnoteText, SmallTitleText } from '@/shared/ui';
import { Accordion, ScrollArea } from '@/shared/ui-kit';
import { useNotification } from '@/shared/ui-kit/NotificationContext';
import { type OperationTemplate, useAllTemplates, useTemplateMutations } from '@/domains/operation-templates';
import { ChainTitle } from '@/entities/chain';
import { generateTemplateName } from '../lib/autoName';

import { TemplateListItem } from './TemplateListItem';

type Props = {
  api: ApiPromise | null;
  chainId: ChainId;
  callData: string;
  specVersion: number | null;
  onApply: (template: OperationTemplate) => void;
};

export const TemplatesPanel = ({ api, chainId, callData, specVersion, onApply }: Props) => {
  const { t } = useI18n();
  const { toast } = useNotification();
  const { data: allTemplates } = useAllTemplates();
  const { save } = useTemplateMutations();

  const { current, byOtherChain } = useMemo(() => {
    const current: OperationTemplate[] = [];
    const byOtherChain = new Map<ChainId, OperationTemplate[]>();

    for (const template of allTemplates) {
      if (template.chainId === chainId) {
        current.push(template);
      } else {
        const list = byOtherChain.get(template.chainId) ?? [];
        list.push(template);
        byOtherChain.set(template.chainId, list);
      }
    }

    return { current, byOtherChain };
  }, [allTemplates, chainId]);

  const canSave = isHex(callData) && specVersion !== null;

  const handleSave = async () => {
    if (specVersion === null || !isHex(callData)) return;

    await save({
      name: generateTemplateName(api, callData),
      chainId,
      callData,
      specVersion,
    });
    toast.success(t('operationTemplates.toastCreated'));
  };

  return (
    <div className="flex h-full w-full flex-col">
      <header className="flex flex-col gap-y-2 border-b border-container-border px-4 py-3 pe-10">
        <SmallTitleText>{t('operationTemplates.panelTitle')}</SmallTitleText>
        <ChainTitle chainId={chainId} iconSize={14} fontClass="text-footnote" />
        <Button size="sm" pallet="secondary" disabled={!canSave} onClick={handleSave}>
          {t('operationTemplates.saveButton')}
        </Button>
      </header>

      <div className="min-h-0 flex-1">
        <ScrollArea>
          <div className="flex flex-col gap-y-1 px-2 py-3">
            {current.length === 0 && (
              <FootnoteText className="px-2 py-4 text-center text-text-tertiary">
                {t('operationTemplates.emptyListDescription')}
              </FootnoteText>
            )}
            {current.map((template) => (
              <TemplateListItem
                key={template.id}
                template={template}
                currentSpecVersion={specVersion}
                onApply={onApply}
              />
            ))}
          </div>

          {byOtherChain.size > 0 && (
            <div className="px-2 pb-3">
              <Accordion>
                <Accordion.Trigger>
                  <FootnoteText className="text-text-tertiary">
                    {t('operationTemplates.otherChains', { num: byOtherChain.size })}
                  </FootnoteText>
                </Accordion.Trigger>
                <Accordion.Content>
                  <div className="flex flex-col gap-y-1 pt-1">
                    {Array.from(byOtherChain.entries()).map(([otherChainId, templates]) => (
                      <div key={otherChainId} className="flex flex-col gap-y-1">
                        {templates.map((template) => (
                          <TemplateListItem
                            key={template.id}
                            template={template}
                            currentSpecVersion={specVersion}
                            disabled
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </Accordion.Content>
              </Accordion>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
};
