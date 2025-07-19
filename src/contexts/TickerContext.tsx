'use client';

import React, { createContext, useState, useContext, ReactNode } from 'react';

interface TickerContextType {
  isTickerVisible: boolean;
  setTickerVisible: (visible: boolean) => void;
}

const TickerContext = createContext<TickerContextType | undefined>(undefined);

export const TickerProvider = ({ children }: { children: ReactNode }) => {
  const [isTickerVisible, setIsTickerVisible] = useState(true);

  const setTickerVisible = (visible: boolean) => {
    setIsTickerVisible(visible);
  };

  return (
    <TickerContext.Provider value={{ isTickerVisible, setTickerVisible }}>
      {children}
    </TickerContext.Provider>
  );
};

export const useTicker = () => {
  const context = useContext(TickerContext);
  if (context === undefined) {
    throw new Error('useTicker must be used within a TickerProvider');
  }
  return context;
};
