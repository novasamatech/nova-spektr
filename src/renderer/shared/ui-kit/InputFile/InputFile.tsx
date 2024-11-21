import { type ChangeEvent, type ComponentPropsWithoutRef, forwardRef, useState } from 'react';

import { cnTw } from '@/shared/lib/utils';
import { Icon } from '@/shared/ui';

export type HTMLInputFileProps = 'required' | 'disabled' | 'accept' | 'placeholder';

type Props = Pick<ComponentPropsWithoutRef<'input'>, HTMLInputFileProps> & {
  invalid?: boolean;
  onChange?: (file: File) => void;
};

export const InputFile = forwardRef<HTMLInputElement, Props>(
  ({ placeholder, invalid = false, onChange, ...props }, ref) => {
    const [fileName, setFileName] = useState('');

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files) return;

      const file = files.item(0);
      if (!file) return;

      const fileName = file.name;
      const fileFormat = fileName.slice(fileName.lastIndexOf('.'), fileName.length);
      const acceptedFormats = props.accept?.split(',');

      if (acceptedFormats && !(acceptedFormats.includes(file.type) || acceptedFormats.includes(fileFormat))) return;

      onChange?.(file);
      setFileName(file.name);
    };

    return (
      <label
        className={cnTw(
          'flex h-full w-full items-center justify-center rounded p-3',
          'cursor-pointer border border-dashed border-filter-border',
          'focus-within:border-active-container-border hover:border-active-container-border active:border-active-container-border',
          invalid && 'border-filter-border-negative',
        )}
      >
        <div className="flex flex-col items-center gap-y-2">
          <Icon name={invalid ? 'refresh' : 'uploadFile'} />
          {fileName ? (
            <p className="text-footnote">{fileName}</p>
          ) : (
            <p className="text-button-small text-primary-button-background-default">{placeholder}</p>
          )}
        </div>
        <input
          className="visually-hidden"
          data-testid="file-input"
          spellCheck="false"
          type="file"
          ref={ref}
          onChange={handleFileChange}
          {...props}
        />
      </label>
    );
  },
);
