import React, { createContext, useContext, useState } from "react";
import { WSClient } from "../utils/ws";

interface WSContextValue {
  wsClient: WSClient | null;
  setWsClient: (ws: WSClient) => void;
}

const WSContext = createContext<WSContextValue | undefined>(undefined);

export const WSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [wsClient, setWsClient] = useState<WSClient | null>(null);

  return (
    <WSContext.Provider value={{ wsClient, setWsClient }}>
      {children}
    </WSContext.Provider>
  );
};

export const useWS = () => {
  const context = useContext(WSContext);
  if (!context) throw new Error("useWS must be used within WSProvider");
  return context;
};
