import { RadioGroup as HeadlessRadioGroup } from '@headlessui/react';
import { Fragment, type PropsWithChildren } from 'react';

import { cnTw } from '@/shared/lib/utils';
import { BodyText, HeaderTitleText } from '../Typography';

import { type RadioOption } from './common/types';
import './RadioGroup.css';

type Props = {
  option: RadioOption<unknown>;
};

export const RadioCard = ({ option, children }: PropsWithChildren<Props>) => {
  const { id, value, title, description } = option;

  // Not using ui-active, because when Option is checked and child is another headless-ui component (like Dropdown)
  // it makes all dropdown items seem to be selected as well (pure CSS issue)
  return (
    <HeadlessRadioGroup.Option value={{ id, value }} as={Fragment}>
      {({ checked }) => (
        <div
          className={cnTw(
            'max-w-[300px] flex-1 cursor-pointer rounded border border-filter-border p-6',
            'transition hover:bg-hover',
            checked && 'border-active-container-border',
          )}
        >
          <div className="flex items-center justify-between">
            <HeaderTitleText as="p" className="mb-2 text-tab-text-accent">
              {title}
            </HeaderTitleText>

            <span
              className={cnTw(
                'relative h-4 w-4 rounded-full border border-filter-border bg-card-background',
                checked ? 'spektr-radio border-0 bg-primary-button-background-default' : 'border-filter-border',
              )}
            />
          </div>

          {description && <BodyText className="text-text-secondary">{description}</BodyText>}

          <hr className="my-6 w-full border-divider" />

          {children}
        </div>
      )}
    </HeadlessRadioGroup.Option>
  );
};
