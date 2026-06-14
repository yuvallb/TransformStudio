import { create } from 'zustand';

import type { Workflow, WorkflowDiff } from '@/lib/types';

export type CodeViewMode = 'node' | 'pipeline';
export type SaveStatus = 'idle' | 'saving' | 'saved';

export interface CompareMode {
  baseWorkflow: Workflow;
  targetWorkflow: Workflow;
  diff: WorkflowDiff;
  baseLabel: string;
  targetLabel: string;
}

interface UiState {
  bottomPanelOpen: boolean;
  codeViewMode: CodeViewMode;
  rightPanelTab: 'inspector' | 'profile' | 'code';
  highlightedColumn: string | null;
  saveStatus: SaveStatus;
  versionPanelOpen: boolean;
  compareMode: CompareMode | null;
  isSharedImport: boolean;

  setBottomPanelOpen: (open: boolean) => void;
  setCodeViewMode: (mode: CodeViewMode) => void;
  setRightPanelTab: (tab: 'inspector' | 'profile' | 'code') => void;
  setHighlightedColumn: (column: string | null) => void;
  setSaveStatus: (status: SaveStatus) => void;
  setVersionPanelOpen: (open: boolean) => void;
  setCompareMode: (mode: CompareMode | null) => void;
  setSharedImport: (shared: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  bottomPanelOpen: true,
  codeViewMode: 'pipeline',
  rightPanelTab: 'inspector',
  highlightedColumn: null,
  saveStatus: 'idle',
  versionPanelOpen: false,
  compareMode: null,
  isSharedImport: false,

  setBottomPanelOpen(open) {
    set({ bottomPanelOpen: open });
  },

  setCodeViewMode(mode) {
    set({ codeViewMode: mode });
  },

  setRightPanelTab(tab) {
    set({ rightPanelTab: tab });
  },

  setHighlightedColumn(column) {
    set({ highlightedColumn: column });
  },

  setSaveStatus(status) {
    set({ saveStatus: status });
  },

  setVersionPanelOpen(open) {
    set({ versionPanelOpen: open });
  },

  setCompareMode(mode) {
    set({ compareMode: mode });
  },

  setSharedImport(shared) {
    set({ isSharedImport: shared });
  },
}));
