import { useState } from 'react';
import type { Region, OceanGoResponse } from '../types';
import styles from './ShareButton.module.css';

interface ShareButtonProps {
  region: Region;
  data: OceanGoResponse;
}

export const ShareButton = ({ region, data }: ShareButtonProps) => {
  const [copied, setCopied] = useState(false);

  const generateShareUrl = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('region', region.id);
    return url.toString();
  };

  const copyToClipboard = async () => {
    try {
      const shareUrl = generateShareUrl();
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const shareNative = async () => {
    try {
      const shareUrl = generateShareUrl();
      const shareText = `Ocean conditions for ${region.displayName}:\n\n` +
        Object.entries(data.activities)
          .map(([activity, rec]) => {
            const emoji = activity === 'snorkeling' ? '🤿' : activity === 'kayaking' ? '🛶' : activity === 'sup' ? '🏄' : '🎣';
            const statusEmoji = rec.status === 'good' ? '✅' : rec.status === 'caution' ? '⚠️' : '❌';
            return `${emoji} ${activity}: ${statusEmoji} ${rec.status}`;
          })
          .join('\n') +
        `\n\n${shareUrl}`;

      if (navigator.share) {
        await navigator.share({
          title: `OceanGo - ${region.displayName}`,
          text: shareText,
          url: shareUrl,
        });
      } else {
        copyToClipboard();
      }
    } catch (error) {
      // User cancelled or error - fallback to copy
      if ((error as Error).name !== 'AbortError') {
        copyToClipboard();
      }
    }
  };

  return (
    <div className={styles.container}>
      <button
        className={styles.button}
        onClick={shareNative}
        aria-label="Share conditions"
        title="Share conditions"
      >
        <span className={styles.icon}>🔗</span>
        {copied && <span className={styles.copied}>Copied!</span>}
      </button>
    </div>
  );
};

