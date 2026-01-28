'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

type DrawerType = 'LEAD' | 'PROPERTY' | 'EMAIL' | null;

interface GlobalState {
  // Drawer State
  drawerOpen: boolean;
  drawerMinimized: boolean;
  drawerType: DrawerType;
  
  // Form Data Persistence
  leadFormData: any;
  propertyFormData: any;
  emailFormData: any;
  
  // AI Chat Persistence
  aiChatDraft: string;

  // Actions
  openDrawer: (type: DrawerType) => void;
  closeDrawer: () => void;
  minimizeDrawer: () => void;
  maximizeDrawer: () => void;
  updateLeadForm: (data: any) => void;
  updatePropertyForm: (data: any) => void;
  updateEmailForm: (data: any) => void;
  setAiChatDraft: (text: string) => void;
}

const GlobalStateContext = createContext<GlobalState | undefined>(undefined);

export function GlobalStateProvider({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMinimized, setDrawerMinimized] = useState(false);
  const [drawerType, setDrawerType] = useState<DrawerType>(null);
  
  const [leadFormData, setLeadFormData] = useState({});
  const [propertyFormData, setPropertyFormData] = useState({});
  const [emailFormData, setEmailFormData] = useState({});
  const [aiChatDraft, setAiChatDraft] = useState('');

  const openDrawer = (type: DrawerType) => {
    setDrawerType(type);
    setDrawerOpen(true);
    setDrawerMinimized(false);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setDrawerMinimized(false);
  };

  const minimizeDrawer = () => setDrawerMinimized(true);
  const maximizeDrawer = () => setDrawerMinimized(false);

  const updateLeadForm = (data: any) => {
    setLeadFormData((prev) => ({ ...prev, ...data }));
  };

  const updatePropertyForm = (data: any) => {
    setPropertyFormData((prev) => ({ ...prev, ...data }));
  };

  const updateEmailForm = (data: any) => {
    setEmailFormData((prev) => ({ ...prev, ...data }));
  };

  return (
    <GlobalStateContext.Provider
      value={{
        drawerOpen,
        drawerMinimized,
        drawerType,
        leadFormData,
        propertyFormData,
        emailFormData,
        aiChatDraft,
        openDrawer,
        closeDrawer,
        minimizeDrawer,
        maximizeDrawer,
        updateLeadForm,
        updatePropertyForm,
        updateEmailForm,
        setAiChatDraft,
      }}
    >
      {children}
    </GlobalStateContext.Provider>
  );
}

export function useGlobalState() {
  const context = useContext(GlobalStateContext);
  if (context === undefined) {
    throw new Error('useGlobalState must be used within a GlobalStateProvider');
  }
  return context;
}
