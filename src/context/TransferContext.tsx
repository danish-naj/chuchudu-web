import React, { createContext, useContext, useState, ReactNode } from 'react';

export type TransferStatus = 'pending' | 'uploading' | 'downloading' | 'completed' | 'error';
export type TransferType = 'upload' | 'download' | 'share';

export interface Transfer {
  id: string;
  name: string;
  type: TransferType;
  status: TransferStatus;
  progress: number; // bytes
  total: number; // bytes
  error?: string;
  createdAt: number;
}

interface TransferContextType {
  transfers: Transfer[];
  addTransfer: (transfer: Omit<Transfer, 'createdAt'>) => void;
  updateTransferProgress: (id: string, progress: number) => void;
  updateTransferStatus: (id: string, status: TransferStatus, error?: string) => void;
  removeTransfer: (id: string) => void;
  getActiveTransfers: () => Transfer[];
}

const TransferContext = createContext<TransferContextType | undefined>(undefined);

export function TransferProvider({ children }: { children: ReactNode }) {
  const [transfers, setTransfers] = useState<Transfer[]>(() => {
    const saved = localStorage.getItem('chuchudu_transfers');
    if (saved) {
      try {
        return JSON.parse(saved).map((t: any) => 
          (t.status === 'uploading' || t.status === 'downloading' || t.status === 'pending') 
            ? { ...t, status: 'error', error: 'Interrupted' } 
            : t
        );
      } catch (e) { return []; }
    }
    return [];
  });

  React.useEffect(() => {
    localStorage.setItem('chuchudu_transfers', JSON.stringify(transfers));
  }, [transfers]);

  const addTransfer = (transfer: Omit<Transfer, 'createdAt'>) => {
    setTransfers(prev => [{ ...transfer, createdAt: Date.now() }, ...prev]);
  };

  const updateTransferProgress = (id: string, progress: number) => {
    setTransfers(prev => prev.map(t => t.id === id ? { ...t, progress } : t));
  };

  const updateTransferStatus = (id: string, status: TransferStatus, error?: string) => {
    setTransfers(prev => prev.map(t => t.id === id ? { ...t, status, error } : t));
  };

  const removeTransfer = (id: string) => {
    setTransfers(prev => prev.filter(t => t.id !== id));
  };

  const getActiveTransfers = () => {
    return transfers.filter(t => t.status === 'uploading' || t.status === 'downloading' || t.status === 'pending');
  };

  return (
    <TransferContext.Provider value={{
      transfers,
      addTransfer,
      updateTransferProgress,
      updateTransferStatus,
      removeTransfer,
      getActiveTransfers
    }}>
      {children}
    </TransferContext.Provider>
  );
}

export function useTransfers() {
  const context = useContext(TransferContext);
  if (context === undefined) {
    throw new Error('useTransfers must be used within a TransferProvider');
  }
  return context;
}
