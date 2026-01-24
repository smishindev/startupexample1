import { useState, useMemo } from 'react';
import { ShareData } from '../services/shareService';
import { ShareDialog } from '../components/Shared/ShareDialog';
import React from 'react';

export interface UseShareOptions {
  contentType: 'course' | 'certificate';
  contentId: string;
  generateShareData: () => ShareData;
  preview?: React.ReactNode;
  metadata?: {
    title?: string;
    category?: string;
    level?: string;
    price?: number;
  };
}

export function useShare({
  contentType,
  contentId,
  generateShareData,
  preview,
  metadata,
}: UseShareOptions) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Always regenerate shareData based on current data
  // The dialog won't be visible when closed anyway
  const shareData = useMemo(() => {
    return generateShareData();
  }, [generateShareData]);

  const openShareDialog = () => {
    setIsDialogOpen(true);
  };

  const closeShareDialog = () => {
    setIsDialogOpen(false);
  };

  const ShareDialogComponent = () => 
    React.createElement(ShareDialog, {
      open: isDialogOpen,
      onClose: closeShareDialog,
      shareData,
      contentType,
      contentId,
      preview,
      metadata,
    });

  return {
    openShareDialog,
    closeShareDialog,
    ShareDialogComponent,
    isDialogOpen,
  };
}
