import { type ApiPromise } from '@polkadot/api';
import { useState } from 'react';
import { createPortal } from 'react-dom';

import { type ChainId } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { Icon } from '@/shared/ui';
import { useNotification } from '@/shared/ui-kit/NotificationContext';
import { useTheme } from '@/shared/ui-kit/Theme/useTheme';
import { type OperationTemplate } from '@/domains/operation-templates';

import { TemplatesPanel } from './TemplatesPanel';

const DEFAULT_MODAL_WIDTH = '27.5rem'; // w-modal — see tailwind.config.ts
const PANEL_WIDTH = '22rem';

type Props = {
  api: ApiPromise | null;
  chainId: ChainId;
  callData: string;
  specVersion: number | null;
  onApply: (callData: string) => void;
  /** Width of the parent modal (must match its Tailwind width). Defaults to the
`md` modal width. */
  modalWidth?: string;
};

export const OperationTemplatesToolbar = ({
  api,
  chainId,
  callData,
  specVersion,
  onApply,
  modalWidth = DEFAULT_MODAL_WIDTH,
}: Props) => {
  const { t } = useI18n();
  const { toast } = useNotification();
  const { portalContainer } = useTheme();
  const [open, setOpen] = useState(false);

  const handleApply = (template: OperationTemplate) => {
    onApply(template.callData);
    toast.success(t('operationTemplates.toastApplied'));
    setOpen(false);
  };

  if (!portalContainer) return null;

  return createPortal(
    <>
      <button
        type="button"
        aria-label={t('operationTemplates.panelTitle')}
        style={{
          left: `calc(50% + ${modalWidth} / 2)`,
          transform: open ? `translate(${PANEL_WIDTH}, -50%)` : 'translate(0, -50%)',
        }}
        className={cnTw(
          'pointer-events-auto absolute top-1/2 z-[55] flex flex-col items-center justify-center gap-y-1.5',
          'h-24 w-5 rounded-r-md border border-l-0 border-container-border bg-white py-2 text-icon-default shadow-modal',
          'transition-[transform,background-color,color] duration-200 ease-out outline-none',
          'hover:bg-block-background-hover hover:text-icon-hover',
          'focus-visible:bg-block-background-hover focus-visible:text-icon-hover',
        )}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name={open ? 'arrowLeft' : 'arrowRight'} size={10} />
        <span className="text-caption tracking-wider uppercase [writing-mode:vertical-rl]">
          {t('operationTemplates.panelTitle')}
        </span>
      </button>

      <div
        style={{ left: `calc(50% + ${modalWidth} / 2)` }}
        className="pointer-events-none absolute top-0 right-0 bottom-0 z-[54] overflow-hidden"
      >
        <div
          style={{
            width: PANEL_WIDTH,
            height: '36rem',
            maxHeight: 'calc(100vh - 2rem)',
            transform: open ? 'translate(0, -50%)' : 'translate(-100%, -50%)',
          }}
          className={cnTw(
            'absolute top-1/2 left-0 flex flex-col',
            'rounded-r-lg border-l border-container-border bg-white shadow-modal',
            'transition-transform duration-200 ease-out',
            open ? 'pointer-events-auto' : 'pointer-events-none',
          )}
        >
          <TemplatesPanel
            api={api}
            chainId={chainId}
            callData={callData}
            specVersion={specVersion}
            onApply={handleApply}
          />
        </div>
      </div>
    </>,
    portalContainer,
  );
};
