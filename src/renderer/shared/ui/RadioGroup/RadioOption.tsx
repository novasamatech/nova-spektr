import { Fragment, PropsWithChildren } from 'react';
import { RadioGroup as HeadlessRadioGroup } from '@headlessui/react';

import { cnTw } from '@shared/lib/utils';
import { RadioOption } from './common/types';
import { SmallTitleText } from '@shared/ui';
import './RadioGroup.css';

type Props = {
  option: RadioOption;
};

const Option = ({ option, children }: PropsWithChildren<Props>) => {
  const { id, value, title } = option;

  // Not using ui-active, because when Option is checked and child is another headless-ui component (like Dropdown)
  // it makes all dropdown items seem to be selected as well (pure CSS issue)
  return (
    <HeadlessRadioGroup.Option value={{ id, value }} as={Fragment}>
      {({ checked }) => (
        <div
          className={cnTw(
            'rounded border border-filter-border cursor-pointer mb-2 last:mb-0',
            checked && 'border-active-container-border',
          )}
        >
          <div
            className={cnTw(
              'flex justify-between items-center p-3 cursor-pointer hover:bg-hover focus:bg-hover transition',
              checked ? 'bg-hover' : 'bg-tab-background',
            )}
          >
            <SmallTitleText as="p" className={cnTw('text-button-large', checked && 'text-action-text')}>
              {title}
            </SmallTitleText>
            <span
              className={cnTw(
                'relative w-4 h-4 rounded-full border border-filter-border bg-card-background',
                checked ? 'spektr-radio border-0 bg-primary-button-background-default' : 'border-filter-border',
              )}
            />
          </div>
          {children && <div className="p-3">{children}</div>}
        </div>
      )}
    </HeadlessRadioGroup.Option>
  );
};

export default Option;
