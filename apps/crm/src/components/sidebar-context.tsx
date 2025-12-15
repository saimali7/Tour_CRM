"use client";

import * as React from "react";

type SidebarState = "expanded" | "collapsed" | "hidden";

interface SidebarContextValue {
  state: SidebarState;
  isExpanded: boolean;
  isCollapsed: boolean;
  isHidden: boolean;
  toggle: () => void;
  expand: () => void;
  collapse: () => void;
  hide: () => void;
}

const SidebarContext = React.createContext<SidebarContextValue | undefined>(
  undefined
);

const STORAGE_KEY = "sidebar-state";

function getSavedState(): SidebarState {
  if (typeof window === "undefined") return "expanded";
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "expanded" || saved === "collapsed") return saved;
  return "expanded";
}

interface SidebarProviderProps {
  children: React.ReactNode;
  defaultState?: SidebarState;
}

export function SidebarProvider({
  children,
  defaultState,
}: SidebarProviderProps) {
  const [state, setState] = React.useState<SidebarState>(() => {
    if (defaultState) return defaultState;
    return "expanded"; // SSR default
  });

  // Hydrate from localStorage on mount
  React.useEffect(() => {
    if (!defaultState) {
      setState(getSavedState());
    }
  }, [defaultState]);

  // Persist to localStorage
  React.useEffect(() => {
    if (state !== "hidden") {
      localStorage.setItem(STORAGE_KEY, state);
    }
  }, [state]);

  // Keyboard shortcut: Cmd+\ or Ctrl+\
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        e.preventDefault();
        setState((prev) => (prev === "expanded" ? "collapsed" : "expanded"));
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const toggle = React.useCallback(() => {
    setState((prev) => (prev === "expanded" ? "collapsed" : "expanded"));
  }, []);

  const expand = React.useCallback(() => setState("expanded"), []);
  const collapse = React.useCallback(() => setState("collapsed"), []);
  const hide = React.useCallback(() => setState("hidden"), []);

  const value = React.useMemo(
    () => ({
      state,
      isExpanded: state === "expanded",
      isCollapsed: state === "collapsed",
      isHidden: state === "hidden",
      toggle,
      expand,
      collapse,
      hide,
    }),
    [state, toggle, expand, collapse, hide]
  );

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}
