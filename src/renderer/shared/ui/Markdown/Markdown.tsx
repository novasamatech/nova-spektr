import { type FC, useState } from 'react';
import ReactMarkdown, { type Components, type Options } from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

import { BodyText, InfoLink, Checkbox, Button, Icon } from '@shared/ui';
import { cnTw } from '@shared/lib/utils';

const rehypeOptions: Options['remarkRehypeOptions'] = { allowDangerousHtml: true };
const rehypePlugins: Options['rehypePlugins'] = [rehypeRaw];
const remarkPlugins: Options['remarkPlugins'] = [remarkGfm];

const components: Components = {
  h1: ({ node, className, ...props }) => (
    <h1 className={cnTw('text-large-title mt-6 pb-2 border-b', className)} {...props} />
  ),
  h2: ({ node, className, ...props }) => <h2 className={cnTw('text-title mt-4', className)} {...props} />,
  h3: ({ node, className, ...props }) => <h3 className={cnTw('text-medium-title mt-2', className)} {...props} />,
  h4: ({ node, className, ...props }) => <h4 className={cnTw('text-small-title mt-2', className)} {...props} />,
  ul: ({ node, className, ...props }) => (
    <ul
      className={cnTw(
        'appearance-none flex flex-col gap-0.5',
        {
          'ml-[2ch] list-outside list-disc': !className,
        },
        className,
      )}
      {...props}
    />
  ),
  li: ({ node, children, className, ...props }) => (
    <li className={className} {...props}>
      <div className={cnTw({ 'flex items-center gap-2': className?.includes('task-list-item') })}>{children}</div>
    </li>
  ),
  ol: ({ node, className, ...props }) => (
    <ul
      className={cnTw('appearance-none flex flex-col gap-0.5 ml-[2ch] list-outside list-decimal', className)}
      {...props}
    />
  ),
  a: ({ node, ...props }) => (
    <InfoLink
      className="text-primary-button-background-default hover:underline focus:w-full"
      url={props.href ?? ''}
      size="inherit"
    >
      {props.children}
    </InfoLink>
  ),
  p: (props) => <BodyText as="p" {...props} />,
  hr: () => <hr className="bg-current" />,
  input: ({ node, type, ...props }) => (type === 'checkbox' ? <Checkbox {...props} /> : <input {...props} />),
  img: ({ node, className, ...props }) => {
    const [showError, setShowError] = useState(false);

    return showError ? (
      <div className="flex flex-wrap items-center justify-center p-2 pl-3 w-fit rounded-md border border-alert-border-negative">
        <div className="flex items-center gap-2">
          <Icon className="text-icon-negative" size={16} name="warn" />
          <span>Error while loading image</span>
        </div>
        <Button size="sm" variant="text" onClick={() => setShowError(false)}>
          Retry
        </Button>
      </div>
    ) : (
      <img className={cnTw('max-w-full', className)} {...props} onError={() => setShowError(true)} />
    );
  },
  code: ({ node, className, ...props }) => {
    return (
      <code
        className={cnTw('border rounded-md leading-none box-decoration-clone bg-block-background px-0.5', className)}
        {...props}
      />
    );
  },
  pre: ({ node, children, className, ...props }) => {
    return (
      <pre className={cnTw('flex flex-col *:leading-normal *:pl-2', className)} {...props}>
        {children}
      </pre>
    );
  },
  table: ({ node, className, ...props }) => <table className={cnTw('border-collapse', className)} {...props} />,
  td: ({ node, className, ...props }) => <td className={cnTw('py-2 px-4 border', className)} {...props} />,
  th: ({ node, className, ...props }) => <th className={cnTw('py-2 px-4 border font-bold', className)} {...props} />,
  blockquote: ({ node, className, ...props }) => (
    <blockquote className={cnTw('px-2 py-1 border-l-4 whitespace-normal', className)} {...props} />
  ),
};

export const Markdown: FC<{ children: string }> = ({ children }) => {
  return (
    <ReactMarkdown
      className="flex flex-col gap-3 text-body whitespace-pre-line"
      remarkRehypeOptions={rehypeOptions}
      remarkPlugins={remarkPlugins}
      rehypePlugins={rehypePlugins}
      components={components}
    >
      {children}
    </ReactMarkdown>
  );
};