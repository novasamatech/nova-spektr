import './Markdown.css';

import { noop } from 'lodash';
import { type ChangeEvent, memo, useState } from 'react';
import ReactMarkdown, { type Components, type Options } from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/Buttons';
import { Icon } from '@/shared/ui/Icon/Icon';
import { InfoLink } from '@/shared/ui/InfoLink/InfoLink';
import { Checkbox } from '../Checkbox/Checkbox';

const rehypeOptions: Options['remarkRehypeOptions'] = { allowDangerousHtml: true };
const rehypePlugins: Options['rehypePlugins'] = [rehypeRaw];
const remarkPlugins: Options['remarkPlugins'] = [remarkGfm];

const components: Components = {
  h1: ({ node: _, className, ...props }) => (
    <h1 className={cnTw('border-b border-filter-border pb-2 text-header-title not-first:mt-6', className)} {...props} />
  ),
  h2: ({ node: _, className, ...props }) => (
    <h2 className={cnTw('text-header-title not-first:mt-4', className)} {...props} />
  ),
  h3: ({ node: _, className, ...props }) => (
    <h3 className={cnTw('text-footnote not-first:mt-2', className)} {...props} />
  ),
  h4: ({ node: _, className, ...props }) => (
    <h4 className={cnTw('text-small-title not-first:mt-2', className)} {...props} />
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
      {children}
    </li>
  ),
  ol: ({ node: _, className, ...props }) => (
    <ul
      className={cnTw('ml-[2ch] inline-flex list-outside list-decimal appearance-none flex-col gap-0.5', className)}
      {...props}
    />
  ),
  a: ({ node: _, ...props }) => (
    <InfoLink
      className="text-primary-button-background-default hover:underline focus:w-full"
      url={props.href ?? ''}
      size="inherit"
      onClick={e => e.stopPropagation()}
    >
      {props.children}
    </InfoLink>
  ),
  p: ({ node: _, className, ...props }) => (
    <span className={cnTw('overflow-hidden text-start text-ellipsis text-inherit', className)} {...props} />
  ),
  hr: () => <hr className="bg-current" />,
  input: ({ node: _, type, className, ...props }) =>
    type === 'checkbox' ? (
      <span className={cnTw('me-1 inline-block', className)}>
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
      </span>
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
      <img className={cnTw('max-w-full rounded-md', className)} {...props} onError={() => setShowError(true)} />
    );
  },
  code: ({ node: _, className, ...props }) => {
    return (
      <code
        className={cnTw(
          'rounded-md border border-filter-border bg-block-background box-decoration-clone px-0.5 leading-none',
          className,
        )}
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
  td: ({ node: _, className, ...props }) => (
    <td className={cnTw('border border-filter-border px-4 py-2', className)} {...props} />
  ),
  th: ({ node: _, className, ...props }) => (
    <th className={cnTw('border border-filter-border px-4 py-2 font-bold', className)} {...props} />
  ),
  blockquote: ({ node: _, className, ...props }) => (
    <blockquote className={cnTw('border-l-4 px-2 py-1 whitespace-normal', className)} {...props} />
  ),
};

type Props = {
  compact?: boolean;
  cut?: string;
  children: string;
};

export const Markdown = memo(({ compact, cut, children }: Props) => {
  if (!children) {
    return null;
  }

  const markdown = (
    <div
      className={cnTw('flex flex-col overflow-hidden text-body whitespace-pre-line', {
        'gap-3': !compact,
        'gap-0.5': compact,
      })}
    >
      <ReactMarkdown
        remarkRehypeOptions={rehypeOptions}
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={components}
      >
        {children}
      </ReactMarkdown>
    </div>
  );

  if (cut) {
    return (
      <div className="markdown-cut overflow-hidden" style={{ maxHeight: cut }}>
        {markdown}
      </div>
    );
  }

  return markdown;
});
