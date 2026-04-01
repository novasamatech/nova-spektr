import ReactJsonViewer from '@uiw/react-json-view';
import { darkTheme } from '@uiw/react-json-view/dark';
import { lightTheme } from '@uiw/react-json-view/light';
import { type CSSProperties, memo, useMemo } from 'react';

import { useTheme } from '../Theme/useTheme';

const DEFAULT_JSON_EXPAND_DEPTH = 10;

type Props = {
  value: object;
  name?: string;
  sortKeys?: (a: string, b: string) => number;
  expandDepth?: number;
};

export const Json = memo(({ value, name, sortKeys, expandDepth = DEFAULT_JSON_EXPAND_DEPTH }: Props) => {
  const { theme } = useTheme();

  const viewerTheme = useMemo<CSSProperties>(() => {
    const base = theme === 'light' ? lightTheme : darkTheme;

    return {
      ...base,
      fontSize: '12px',
      '--w-rjv-font-family': '"Roboto Mono", monospace',
      '--w-rjv-type-string-color': '#E54C9D',
      '--w-rjv-type-int-color': '#1CC5B7',
      '--w-rjv-quotes-color': 'rgba(0, 0, 0, 0.75)',
    };
  }, [theme]);

  return (
    <ReactJsonViewer
      value={value}
      keyName={name}
      enableClipboard={false}
      displayDataTypes={false}
      shortenTextAfterLength={50}
      style={viewerTheme}
      objectSortKeys={sortKeys}
      shouldExpandNodeInitially={(_, { level }) => level <= expandDepth}
    >
      <ReactJsonViewer.Null render={() => <span style={{ color: 'var(--w-rjv-type-null-color)' }}>null</span>} />
    </ReactJsonViewer>
  );
});
