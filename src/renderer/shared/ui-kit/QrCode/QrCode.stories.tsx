import { type Meta, type StoryObj } from '@storybook/react-vite';

import { QrCode } from './QrCode';

const meta: Meta<typeof QrCode> = {
  component: QrCode,
  title: 'Design System/kit/QrCode',
  argTypes: {
    bgColor: { control: 'color' },
    qrColor: { control: 'color' },
    size: { control: 'text' },
    delay: { control: 'number' },
  },
};

export default meta;

type Story = StoryObj<typeof QrCode>;

const encode = (str: string): Uint8Array => new TextEncoder().encode(str);

export const SingleFrame: Story = {
  args: {
    payload: encode('Test!'),
    size: '200px',
    bgColor: '#ffffff',
    qrColor: '#000000',
    testId: 'qr-single-frame',
  },
};

export const MultiFrame: Story = {
  args: {
    payload: [encode('Frame 1: Hola'), encode('Frame 2: Hello'), encode('Frame 3: Bonjour')],
    delay: 250,
    size: '200px',
    bgColor: '#ffffff',
    qrColor: '#000000',
    testId: 'qr-multi-frame',
  },
};
