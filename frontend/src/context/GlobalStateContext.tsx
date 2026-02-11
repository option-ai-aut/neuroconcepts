'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback, useRef } from 'react';

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
  
  // Sidebar State
  sidebarExpanded: boolean;
  
  // Form Data Persistence
  leadFormData: any;
  propertyFormData: any;
  emailFormData: any;
  exposeEditorData: ExposeEditorContext;
  
  // AI Chat Persistence
  aiChatDraft: string;
  
  // Active Editor Context (for AI to know what's open)
  activeExposeContext: ExposeEditorContext | null;
  
  // AI Action Tracking (for triggering refreshes)
  aiActionPerformed: number; // Timestamp of last action

  // Page Header Actions (slot for page-specific buttons)
  headerActions: React.ReactNode;
  setHeaderActions: (actions: React.ReactNode) => void;

  // Mobile Jarvis Chat
  mobileJarvisOpen: boolean;
  setMobileJarvisOpen: (open: boolean) => void;

  // Actions
  openDrawer: (type: DrawerType) => void;
  closeDrawer: () => void;
  minimizeDrawer: () => void;
  maximizeDrawer: () => void;
  setSidebarExpanded: (expanded: boolean) => void;
  updateLeadForm: (data: any) => void;
  updatePropertyForm: (data: any) => void;
  updateEmailForm: (data: any) => void;
  updateExposeEditor: (data: ExposeEditorContext) => void;
  setAiChatDraft: (text: string) => void;
  setActiveExposeContext: (context: ExposeEditorContext | null) => void;
  triggerExposeRefresh: () => void;
  notifyAiAction: () => void; // Call this when AI performs an action
}

const GlobalStateContext = createContext<GlobalState | undefined>(undefined);

export function GlobalStateProvider({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMinimized, setDrawerMinimized] = useState(false);
  const [drawerType, setDrawerType] = useState<DrawerType>(null);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  
  const [leadFormData, setLeadFormData] = useState({});
  const [propertyFormData, setPropertyFormData] = useState({});
  const [emailFormData, setEmailFormData] = useState({});
  const [exposeEditorData, setExposeEditorData] = useState<ExposeEditorContext>({});
  const [aiChatDraft, setAiChatDraft] = useState('');
  const [activeExposeContext, setActiveExposeContext] = useState<ExposeEditorContext | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [aiActionPerformed, setAiActionPerformed] = useState(0);
  const [headerActions, setHeaderActions] = useState<React.ReactNode>(null);
  const [mobileJarvisOpen, setMobileJarvisOpen] = useState(false);

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

  // Notify that AI performed an action (for list refreshes)
  const notifyAiAction = useCallback(() => {
    setAiActionPerformed(Date.now());
  }, []);

  return (
    <GlobalStateContext.Provider
      value={{
        drawerOpen,
        drawerMinimized,
        drawerType,
        sidebarExpanded,
        leadFormData,
        propertyFormData,
        emailFormData,
        exposeEditorData: { ...exposeEditorData, onBlocksUpdated: () => setRefreshTrigger(prev => prev + 1) },
        aiChatDraft,
        activeExposeContext,
        aiActionPerformed,
        headerActions,
        setHeaderActions,
        mobileJarvisOpen,
        setMobileJarvisOpen,
        openDrawer,
        closeDrawer,
        minimizeDrawer,
        maximizeDrawer,
        setSidebarExpanded,
        updateLeadForm,
        updatePropertyForm,
        updateEmailForm,
        updateExposeEditor,
        setAiChatDraft,
        setActiveExposeContext,
        triggerExposeRefresh,
        notifyAiAction,
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
