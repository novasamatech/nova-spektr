import { type Meta, type StoryObj } from '@storybook/react-vite';
import { useEffect, useState } from 'react';

import { Box } from '../Box/Box';
import { ScrollArea } from '../ScrollArea/ScrollArea';
import { Select } from '../Select/Select';

import { QrReader } from './QrReader';
import { type QrReaderCamera } from './types';

const meta: Meta<typeof QrReader> = {
  title: 'Design System/kit/QrReader',
  component: QrReader,
  args: {
    size: 400,
  },
  decorators: [
    (Story, { args }) => {
      const [cameraId, setCameraId] = useState<string | null>(null);
      const [cameras, onCameraList] = useState<QrReaderCamera[]>([]);

      useEffect(() => {
        if (!cameraId) {
          setCameraId(cameras.at(0)?.deviceId ?? null);
        }
      }, [cameras, cameraId]);

      return (
        <Box gap={4}>
          <Story args={{ ...args, cameraId, onCameraList }} />
          <Box width="300px" gap={2}>
            <span>Camera:</span>
            <Select placeholder="Camera" value={cameraId} onChange={setCameraId}>
              {cameras.map(camera => (
                <Select.Item key={camera.deviceId} value={camera.deviceId}>
                  {camera.label}
                </Select.Item>
              ))}
            </Select>
          </Box>
        </Box>
      );
    },
    (Story, { args }) => {
      const [result, setResult] = useState<string[]>([]);
      const pushResult = (text: string) => setResult(list => list.concat(text));

      return (
        <Box gap={4}>
          <Story args={{ ...args, onResult: result => pushResult(result.getText()) }} />
          <Box height="300px" gap={2}>
            <span>Log:</span>
            <div className="min-h-0 rounded-md border py-2 ps-2">
              <ScrollArea>
                <Box gap={1}>
                  {result.map((t, index) => (
                    <span key={index}>{t}</span>
                  ))}
                </Box>
              </ScrollArea>
            </div>
          </Box>
        </Box>
      );
    },
  ],
};

export default meta;

type Story = StoryObj<typeof QrReader>;

export const Default: Story = {};
export const CustomSize: Story = {
  args: {
    size: [500, 300],
  },
};
