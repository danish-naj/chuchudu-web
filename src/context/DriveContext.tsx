import React, { createContext, useContext, useState, useEffect } from 'react';
import { useGoogleLogin, googleLogout } from '@react-oauth/google';
import { DriveClient } from '../drive/driveApi';

interface DriveContextType {
  isConnected: boolean;
  driveClient: DriveClient | null;
  connect: () => void;
  disconnect: () => void;
}

const DriveContext = createContext<DriveContextType>({
  isConnected: false,
  driveClient: null,
  connect: () => {},
  disconnect: () => {}
});

export function DriveProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('chuchudu_drive_token'));
  
  // Implicit flow returns an access token
  const login = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      setToken(tokenResponse.access_token);
      localStorage.setItem('chuchudu_drive_token', tokenResponse.access_token);
    },
    scope: 'https://www.googleapis.com/auth/drive.file'
  });

  const disconnect = () => {
    googleLogout();
    setToken(null);
    localStorage.removeItem('chuchudu_drive_token');
  };

  const driveClient = token ? new DriveClient(token) : null;

  return (
    <DriveContext.Provider value={{
      isConnected: !!token,
      driveClient,
      connect: () => login(),
      disconnect
    }}>
      {children}
    </DriveContext.Provider>
  );
}

export const useDrive = () => useContext(DriveContext);
