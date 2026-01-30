'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

type DrawerType = 'LEAD' | 'PROPERTY' | 'EMAIL' | 'EXPOSE_EDITOR' | null;

// Expose Editor Context - shared between Editor and AI Chat
interface ExposeEditorContext {
  exposeId?: string;
  propertyId?: string;
  templateId?: string;
  isTemplate?: boolean;
  // Callback to refresh editor data when AI makes changes
  onBlocksUpdated?: () => void;
}

interface GlobalState {
  // Drawer State
  drawerOpen: boolean;
  drawerMinimized: boolean;
  drawerType: DrawerType;
  
  // Form Data Persistence
  leadFormData: any;
  propertyFormData: any;
  emailFormData: any;
  exposeEditorData: ExposeEditorContext;
  
  // AI Chat Persistence
  aiChatDraft: string;
  
  // Active Editor Context (for AI to know what's open)
  activeExposeContext: ExposeEditorContext | null;

  // Actions
  openDrawer: (type: DrawerType) => void;
  closeDrawer: () => void;
  minimizeDrawer: () => void;
  maximizeDrawer: () => void;
  updateLeadForm: (data: any) => void;
  updatePropertyForm: (data: any) => void;
  updateEmailForm: (data: any) => void;
  updateExposeEditor: (data: ExposeEditorContext) => void;
  setAiChatDraft: (text: string) => void;
  setActiveExposeContext: (context: ExposeEditorContext | null) => void;
  triggerExposeRefresh: () => void;
}

const GlobalStateContext = createContext<GlobalState | undefined>(undefined);

export function GlobalStateProvider({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMinimized, setDrawerMinimized] = useState(false);
  const [drawerType, setDrawerType] = useState<DrawerType>(null);
  
  const [leadFormData, setLeadFormData] = useState({});
  const [propertyFormData, setPropertyFormData] = useState({});
  const [emailFormData, setEmailFormData] = useState({});
  const [exposeEditorData, setExposeEditorData] = useState<ExposeEditorContext>({});
  const [aiChatDraft, setAiChatDraft] = useState('');
  const [activeExposeContext, setActiveExposeContext] = useState<ExposeEditorContext | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const openDrawer = (type: DrawerType) => {
    setDrawerType(type);
    setDrawerOpen(true);
    setDrawerMinimized(false);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setDrawerMinimized(false);
    // Clear expose context when closing
    if (drawerType === 'EXPOSE_EDITOR') {
      setActiveExposeContext(null);
    }
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

  const updateExposeEditor = (data: ExposeEditorContext) => {
    setExposeEditorData((prev) => ({ ...prev, ...data }));
  };

  // Trigger refresh in ExposeEditor when AI makes changes
  const triggerExposeRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
    // Also call the callback if registered
    if (activeExposeContext?.onBlocksUpdated) {
      activeExposeContext.onBlocksUpdated();
    }
  }, [activeExposeContext]);

  return (
    <GlobalStateContext.Provider
      value={{
        drawerOpen,
        drawerMinimized,
        drawerType,
        leadFormData,
        propertyFormData,
        emailFormData,
        exposeEditorData: { ...exposeEditorData, onBlocksUpdated: () => setRefreshTrigger(prev => prev + 1) },
        aiChatDraft,
        activeExposeContext,
        openDrawer,
        closeDrawer,
        minimizeDrawer,
        maximizeDrawer,
        updateLeadForm,
        updatePropertyForm,
        updateEmailForm,
        updateExposeEditor,
        setAiChatDraft,
        setActiveExposeContext,
        triggerExposeRefresh,
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
