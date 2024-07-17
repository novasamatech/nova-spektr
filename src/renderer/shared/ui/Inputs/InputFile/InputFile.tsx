import { type ChangeEvent, type ComponentPropsWithoutRef, forwardRef, useState } from 'react';

import { cnTw } from '@shared/lib/utils';

import { Icon } from '../../Icon/Icon';
import { FootnoteText, TextBase } from '../../Typography';
import { type HTMLInputFileProps } from '../common/types';

interface Props extends Pick<ComponentPropsWithoutRef<'input'>, HTMLInputFileProps> {
  invalid?: boolean;
  onChange?: (file: File) => void;
}

export const InputFile = forwardRef<HTMLInputElement, Props>(
  ({ placeholder, className, invalid = false, onChange, ...props }, ref) => {
    const [fileName, setFileName] = useState('');

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;

      if (!files || !files.length) {
        return;
      }

      const fileName = files[0].name;
      const fileFormat = fileName.slice(fileName.lastIndexOf('.'), fileName.length);
      const acceptedFormats = props.accept?.split(',');

      if (acceptedFormats && !(acceptedFormats.includes(files[0].type) || acceptedFormats.includes(fileFormat))) {
        return;
      }

      onChange?.(files[0]);
      setFileName(files[0].name);
    };

    return (
      <label
        className={cnTw(
          'h-full p-3 cursor-pointer flex items-center justify-center rounded border border-dashed border-filter-border active:border-active-container-border',
          invalid && 'border-filter-border-negative',
          className,
        )}
      >
        <div className="flex flex-col items-center gap-y-2">
          <Icon name={invalid ? 'refresh' : 'uploadFile'} />
          {fileName ? (
            <FootnoteText>{fileName}</FootnoteText>
          ) : (
            <TextBase className="text-button-small text-primary-button-background-default">{placeholder}</TextBase>
          )}
        </div>
        <input
          className="hidden"
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
