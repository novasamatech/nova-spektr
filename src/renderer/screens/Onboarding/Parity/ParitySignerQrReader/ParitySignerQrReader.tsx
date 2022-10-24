import cn from 'classnames';
import { useState } from 'react';

import { QrReader } from '@renderer/components/common';
import { SeedInfo } from '@renderer/components/common/QrCode/QrReader/common/types';
import { QrReaderProps } from '@renderer/components/common/QrCode/QrReader/QrReader';
import { Icon } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';

const ParitySignerQrReader = ({ cameraId, size = 300, onStart, onResult, onError, onCameraList }: QrReaderProps) => {
  const { t } = useI18n();

  const [isComplete, setIsComplete] = useState(false);
  const [{ decoded, total }, setProgress] = useState({ decoded: 0, total: 0 });

  const handleResult = (data: SeedInfo) => {
    setIsComplete(true);
    onResult(data);
  };

  return (
    <div className="relative" style={{ width: size + 'px', height: size + 'px' }}>
      <QrReader
        cameraId={cameraId}
        className="rounded-2lg"
        size={size}
        onStart={onStart}
        onCameraList={onCameraList}
        onProgress={setProgress}
        onResult={handleResult}
        onError={onError}
      />
      {isComplete && (
        <div className="absolute inset-0 backdrop-blur-sm rounded-2lg after:absolute after:inset-0 after:bg-white/50" />
      )}
      {!isComplete && (
        <Icon name="qrFrame" size={size * 0.55} className="absolute left-1/2 top-[15%] -translate-x-1/2 text-white" />
      )}
      {isComplete && (
        <Icon
          name="checkmarkCutout"
          size={size * 0.25}
          className="absolute left-1/2 top-[30%] -translate-x-1/2 texЩt-success"
        />
      )}
      <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 w-[calc(100%-20px)] p-[15px] pb-6 rounded-lg bg-white">
        <div className="grid grid-flow-col grid-rows-2">
          <p className="text-2xs text-neutral">{t('qrReader.parsingLabel')}</p>
          <p className="text-2xs text-shade-40">{t('qrReader.parsingSubLabel')}</p>
          <p className="row-span-2 self-center justify-self-end text-lg leading-6 text-shade-40">
            <span className={cn(decoded > 0 ? 'text-success' : 'text-shade-40')}>{decoded}</span>
            {/* eslint-disable-next-line i18next/no-literal-string */}
            <span className={cn(decoded > 0 && decoded === total && 'text-success')}> / {total}</span>
          </p>
        </div>
        <div className="relative mt-2">
          <div className="absolute top-0 left-0 h-2 w-full border-2 border-shade-20 rounded-2lg" />
          <div
            className="absolute top-0 left-0 h-2 bg-neutral rounded-2lg transition-[width]"
            style={{ width: (decoded / total || 0) * 100 + '%' }}
          />
        </div>
        {/* TODO: <div>Camera picker</div> */}
      </div>
    </div>
  );
};

export default ParitySignerQrReader;
