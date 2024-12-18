import noop from 'lodash/noop';
import { type ChangeEvent, useState } from 'react';
import ReactMarkdown, { type Components, type Options } from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { Checkbox } from '@/shared/ui-kit';
import { Button } from '../Buttons';
import { Icon } from '../Icon/Icon';
import { InfoLink } from '../InfoLink/InfoLink';
import { BodyText } from '../Typography';

const rehypeOptions: Options['remarkRehypeOptions'] = { allowDangerousHtml: true };
const rehypePlugins: Options['rehypePlugins'] = [rehypeRaw];
const remarkPlugins: Options['remarkPlugins'] = [remarkGfm];

const components: Components = {
  h1: ({ node: _, className, ...props }) => (
    <h1
      className={cnTw('text-balance border-b pb-2 text-button-small [&:not(:first-child)]:mt-6', className)}
      {...props}
    />
  ),
  h2: ({ node: _, className, ...props }) => (
    <h2 className={cnTw('text-balance text-header-title [&:not(:first-child)]:mt-4', className)} {...props} />
  ),
  h3: ({ node: _, className, ...props }) => (
    <h3 className={cnTw('text-balance text-footnote [&:not(:first-child)]:mt-2', className)} {...props} />
  ),
  h4: ({ node: _, className, ...props }) => (
    <h4 className={cnTw('text-balance text-small-title [&:not(:first-child)]:mt-2', className)} {...props} />
  ),
  ul: ({ node: _, className, ...props }) => (
    <ul
      className={cnTw(
        'flex appearance-none flex-col gap-0.5',
        {
          'ml-[2ch] list-outside list-disc': !className,
        },
        className,
      )}
      {...props}
    />
  ),
  li: ({ node: _, children, className, ...props }) => (
    <li className={className} {...props}>
      <div className={cnTw({ 'flex items-center gap-2': className?.includes('task-list-item') })}>{children}</div>
    </li>
  ),
  ol: ({ node: _, className, ...props }) => (
    <ul
      className={cnTw('ml-[2ch] flex list-outside list-decimal appearance-none flex-col gap-0.5', className)}
      {...props}
    />
  ),
  a: ({ node: _, ...props }) => (
    <InfoLink
      className="text-primary-button-background-default hover:underline focus:w-full"
      url={props.href ?? ''}
      size="inherit"
    >
      {props.children}
    </InfoLink>
  ),
  p: ({ node: _, className, ...props }) => (
    <BodyText as="p" className={cnTw('overflow-hidden overflow-ellipsis text-balance', className)} {...props} />
  ),
  hr: () => <hr className="bg-current" />,
  input: ({ node: _, type, ...props }) =>
    type === 'checkbox' ? (
      <Checkbox
        {...props}
        onChange={(newCheckedState: boolean) => {
          if (typeof props.onChange !== 'function') return;

          const event = {
            target: {
              checked: newCheckedState,
            },
          } as ChangeEvent<HTMLInputElement>;
          props.onChange(event);
        }}
        onClick={noop}
      />
    ) : (
      <input {...props} />
    ),
  img: ({ node: _, className, ...props }) => {
    const { t } = useI18n();
    const [showError, setShowError] = useState(false);

    return showError ? (
      <span className="flex w-fit flex-wrap items-center justify-center rounded-md border border-alert-border-negative p-2 pl-3">
        <span className="flex items-center gap-2">
          <Icon className="text-icon-negative" size={16} name="warn" />
          <span>{t('general.image.loadingError')}</span>
        </span>
        <Button size="sm" variant="text" onClick={() => setShowError(false)}>
          {t('general.image.retryLoading')}
        </Button>
      </span>
    ) : (
      <img className={cnTw('max-w-full', className)} {...props} onError={() => setShowError(true)} />
    );
  },
  code: ({ node: _, className, ...props }) => {
    return (
      <code
        className={cnTw('rounded-md border bg-block-background box-decoration-clone px-0.5 leading-none', className)}
        {...props}
      />
    );
  },
  pre: ({ node: _, children, className, ...props }) => {
    return (
      <pre className={cnTw('flex flex-col overflow-x-auto *:w-fit *:pl-2 *:leading-normal', className)} {...props}>
        {children}
      </pre>
    );
  },
  table: ({ node: _, className, ...props }) => <table className={cnTw('border-collapse', className)} {...props} />,
  td: ({ node: _, className, ...props }) => <td className={cnTw('border px-4 py-2', className)} {...props} />,
  th: ({ node: _, className, ...props }) => <th className={cnTw('border px-4 py-2 font-bold', className)} {...props} />,
  blockquote: ({ node: _, className, ...props }) => (
    <blockquote className={cnTw('whitespace-normal border-l-4 px-2 py-1', className)} {...props} />
  ),
};

export const Markdown = ({ children }: { children: string }) => {
  if (!children) {
    return null;
  }

  return (
    <ReactMarkdown
      className="flex flex-col gap-3 overflow-hidden whitespace-pre-line text-body"
      remarkRehypeOptions={rehypeOptions}
      remarkPlugins={remarkPlugins}
      rehypePlugins={rehypePlugins}
      components={components}
    >
      {children}
    </ReactMarkdown>
  );
};
