/**
 * Favicon utility for adding notification badges to the favicon
 */

const BADGE_COLOR = '#4649f6'; // Badge color
const BADGE_SIZE_RATIO = 0.375; // Badge size as ratio of favicon size (GOOD STATE - 0.25 * 1.5)
const BADGE_BORDER_WIDTH = 3; // White border around badge for better visibility (trying 3px padding)

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
        const badgeRadius = badgeSize / 2;
        const whiteCircleRadius = badgeRadius + BADGE_BORDER_WIDTH;
        // Position in top-right corner with small padding
        const badgeX = size - whiteCircleRadius - 2;
        const badgeY = whiteCircleRadius + 2;

        // Draw bigger white circle
        ctx.beginPath();
        ctx.arc(badgeX, badgeY, whiteCircleRadius, 0, 2 * Math.PI);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();

        // Draw slightly smaller colored circle on top
        ctx.beginPath();
        ctx.arc(badgeX, badgeY, badgeRadius, 0, 2 * Math.PI);
        ctx.fillStyle = BADGE_COLOR;
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
