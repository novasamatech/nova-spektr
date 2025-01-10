import { type Meta, type StoryObj } from '@storybook/react';
import { useState } from 'react';

import { Button } from '@/shared/ui';
import { Box } from '../Box/Box';
import { Modal } from '../Modal/Modal';
import { Skeleton } from '../Skeleton/Skeleton';

import { Carousel } from './Carousel';

const meta: Meta<typeof Carousel> = {
  title: 'Design System/kit/Carousel',
  component: Carousel,
};

export default meta;

type Story = StoryObj<typeof Carousel>;

export const Default: Story = {
  render() {
    const [item, setItem] = useState('1');

    return (
      <Box gap={4} width="400px">
        <Box direction="row" gap={2}>
          <Button onClick={() => setItem('1')}>1 Item</Button>
          <Button onClick={() => setItem('2')}>2 Item</Button>
          <Button onClick={() => setItem('3')}>3 Item</Button>
        </Box>
        <Carousel item={item}>
          <Carousel.Item id="1" index={0}>
            <Skeleton height={32} />
          </Carousel.Item>
          <Carousel.Item id="2" index={1}>
            <Skeleton height={24} />
          </Carousel.Item>
          <Carousel.Item id="3" index={2}>
            <Skeleton height={16} />
          </Carousel.Item>
        </Carousel>
        <div>Content after carousel</div>
      </Box>
    );
  },
};

export const InModal: Story = {
  render() {
    const [item, setItem] = useState('1');

    const next = () => {
      setItem(item => {
        switch (item) {
          case '1':
            return '2';
          case '2':
            return '3';
          default:
            return '3';
        }
      });
    };

    const prev = () => {
      setItem(item => {
        switch (item) {
          case '3':
            return '2';
          case '2':
            return '1';
          default:
            return '1';
        }
      });
    };

    return (
      <Modal isOpen size="md">
        <Modal.Title>Carousel</Modal.Title>
        <Modal.Content>
          <Box gap={4}>
            <Carousel item={item}>
              <Carousel.Item id="1" index={0}>
                <Box padding={2}>
                  <Skeleton height={250} />
                </Box>
              </Carousel.Item>
              <Carousel.Item id="2" index={1}>
                <Box padding={2}>
                  <Skeleton height={56} />
                </Box>
              </Carousel.Item>
              <Carousel.Item id="3" index={2}>
                <Box padding={2}>
                  <Skeleton height={64} />
                </Box>
              </Carousel.Item>
            </Carousel>
          </Box>
        </Modal.Content>
        <Modal.Footer>
          <Button disabled={item === '1'} onClick={prev}>
            Back
          </Button>
          <Button disabled={item === '3'} onClick={next}>
            Next
          </Button>
        </Modal.Footer>
      </Modal>
    );
  },
};
