/**
 * Favicon utility for adding notification badges to the favicon
 */

const BADGE_COLOR = '#4649f6'; // Badge color
const BADGE_SIZE_RATIO = 0.375; // Badge size as ratio of favicon size (GOOD STATE - 0.25 * 1.5)
const WHITE_PADDING = 8; // White padding around badge in pixels

/**
 * Draws a circular badge on the favicon
 * @param faviconUrl - URL of the original favicon
 * @param showBadge - Whether to show the badge
 * @returns Promise resolving to the modified favicon URL
 */
export function drawFaviconBadge(faviconUrl: string, showBadge: boolean): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = img.width;
      canvas.width = size;
      canvas.height = size;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.warn('Failed to get canvas context for favicon');
        resolve(faviconUrl);
        return;
      }

      // Draw original favicon
      ctx.drawImage(img, 0, 0, size, size);

      // Draw badge if needed
      if (showBadge) {
        const badgeSize = size * BADGE_SIZE_RATIO;
        const coloredRadius = badgeSize / 2;
        const totalRadius = coloredRadius + WHITE_PADDING;
        // Position in top-right corner with small padding
        const margin = 3;
        const centerX = size - totalRadius - margin;
        const centerY = totalRadius + margin;

        // Draw large white circle as background
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(centerX, centerY, totalRadius, 0, 2 * Math.PI);
        ctx.fill();

        // Draw colored badge circle in the center
        ctx.fillStyle = BADGE_COLOR;
        ctx.beginPath();
        ctx.arc(centerX, centerY, coloredRadius, 0, 2 * Math.PI);
        ctx.fill();
      }

      const dataUrl = canvas.toDataURL('image/png');
      console.log('Favicon updated, showBadge:', showBadge);
      resolve(dataUrl);
    };

    img.onerror = (error) => {
      console.error('Failed to load favicon image:', error);
      resolve(faviconUrl);
    };

    img.src = faviconUrl;
  });
}
