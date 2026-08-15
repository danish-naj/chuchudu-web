import React, { useState, useEffect } from 'react';
import { useFileSystem } from '../hooks/useFileSystem';

interface SecureImageProps {
  fileId: string;
  className?: string;
  alt?: string;
}

export default function SecureImage({ fileId, className = '', alt = 'Secure Image' }: SecureImageProps) {
  const { getFile } = useFileSystem();
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let objectUrl: string | null = null;
    
    const loadImg = async () => {
      try {
        setLoading(true);
        const decrypted = await getFile(fileId);
        objectUrl = URL.createObjectURL(decrypted);
        setUrl(objectUrl);
      } catch (err) {
        console.error("Failed to load secure image", err);
      } finally {
        setLoading(false);
      }
    };

    if (fileId) {
      loadImg();
    }

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileId, getFile]);

  if (loading) {
    return (
      <div className={`animate-pulse bg-surface-container-highest flex items-center justify-center ${className}`}>
        <span className="material-symbols-outlined text-on-surface-variant opacity-50 animate-spin">autorenew</span>
      </div>
    );
  }

  if (!url) {
    return (
      <div className={`bg-surface flex items-center justify-center ${className}`}>
        <span className="material-symbols-outlined text-on-surface-variant">broken_image</span>
      </div>
    );
  }

  return <img src={url} alt={alt} className={className} />;
}
