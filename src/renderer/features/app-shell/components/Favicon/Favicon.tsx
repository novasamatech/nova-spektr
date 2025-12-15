import { useUnit } from 'effector-react';
import { useEffect, useRef } from 'react';

import { faviconModel } from '../../model/favicon-model';

const BADGE_SIZE = 16;
const BADGE_PADDING = 4;
const BADGE_COLOR = '#4649F6';

const getFaviconLink = () => {
  return document.querySelector<HTMLLinkElement>("link[rel='icon']");
};

const createBadgedFaviconDataUrl = (canvas: HTMLCanvasElement, imageSrc: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;

    img.onload = () => {
      const size = 48;

      canvas.width = size;
      canvas.height = size;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);

      const badgeX = size - BADGE_SIZE - 2;
      const badgeY = size - BADGE_SIZE - 2;

      ctx.beginPath();
      ctx.arc(badgeX + BADGE_SIZE / 2, badgeY + BADGE_SIZE / 2, BADGE_SIZE / 2 + BADGE_PADDING, 0, 2 * Math.PI);
      ctx.fillStyle = 'white';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(badgeX + BADGE_SIZE / 2, badgeY + BADGE_SIZE / 2, BADGE_SIZE / 2, 0, 2 * Math.PI);
      ctx.fillStyle = BADGE_COLOR;
      ctx.fill();

      resolve(canvas.toDataURL('image/png'));
    };
  });
};

export const Favicon = () => {
  const hasBadge = useUnit(faviconModel.$hasBadge);
  const canvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const originalFaviconRef = useRef<string | null>(null);

  useEffect(() => {
    const link = getFaviconLink();
    if (link && !originalFaviconRef.current) {
      originalFaviconRef.current = link.href;
    }
  }, []);

  useEffect(() => {
    if (!originalFaviconRef.current) return;

    const link = getFaviconLink();
    if (!link) return;

    if (!hasBadge) {
      link.href = originalFaviconRef.current;

      return;
    }

    createBadgedFaviconDataUrl(canvasRef.current, originalFaviconRef.current).then((dataUrl) => {
      link.href = dataUrl;
    });
  }, [hasBadge]);

  return null;
};
