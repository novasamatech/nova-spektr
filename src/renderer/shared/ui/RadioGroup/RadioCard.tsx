import { RadioGroup as HeadlessRadioGroup } from '@headlessui/react';
import { Fragment, type PropsWithChildren } from 'react';

import { cnTw } from '@shared/lib/utils';

import { BodyText, TitleText } from '../Typography';

import { type RadioOption } from './common/types';
import './RadioGroup.css';

type Props = {
  option: RadioOption;
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
            'flex-1 rounded border border-filter-border cursor-pointer p-6',
            'hover:bg-hover transition',
            checked && 'border-active-container-border',
          )}
        >
          <div className="flex justify-between items-center">
            <TitleText as="p" className={'text-tab-text-accent'}>
              {title}
            </TitleText>

            <span
              className={cnTw(
                'relative w-4 h-4 rounded-full border border-filter-border bg-card-background',
                checked ? 'spektr-radio border-0 bg-primary-button-background-default' : 'border-filter-border',
              )}
            />
          </div>

          {description && <BodyText className="text-text-secondary">{description}</BodyText>}

          <hr className="border-divider my-6 w-full" />

          {children}
        </div>
      )}
    </HeadlessRadioGroup.Option>
  );
};
