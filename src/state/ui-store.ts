import { create } from 'zustand';

import type { PaletteGroup } from '@/nodes/types';
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
  compareMode: CompareMode | null;
  isSharedImport: boolean;
  paramDialogOpen: boolean;
  exportDialogOpen: boolean;
  shareDialogOpen: boolean;
  versionDialogOpen: boolean;
  versionOpenSaveOnMount: boolean;
  helpDialogOpen: boolean;
  aboutDialogOpen: boolean;
  incompatibleDataDialogOpen: boolean;
  customPythonConfirmOpen: boolean;
  customPythonPendingPosition: { x: number; y: number } | null;
  paletteCollapseState: Partial<Record<PaletteGroup, boolean>>;

  setBottomPanelOpen: (open: boolean) => void;
  setCodeViewMode: (mode: CodeViewMode) => void;
  setRightPanelTab: (tab: 'inspector' | 'profile' | 'code') => void;
  setHighlightedColumn: (column: string | null) => void;
  setSaveStatus: (status: SaveStatus) => void;
  setCompareMode: (mode: CompareMode | null) => void;
  setSharedImport: (shared: boolean) => void;
  setParamDialogOpen: (open: boolean) => void;
  setExportDialogOpen: (open: boolean) => void;
  setShareDialogOpen: (open: boolean) => void;
  setVersionDialogOpen: (open: boolean) => void;
  setVersionOpenSaveOnMount: (open: boolean) => void;
  setHelpDialogOpen: (open: boolean) => void;
  setAboutDialogOpen: (open: boolean) => void;
  setIncompatibleDataDialogOpen: (open: boolean) => void;
  openCustomPythonConfirm: (position: { x: number; y: number }) => void;
  closeCustomPythonConfirm: () => void;
  setPaletteGroupCollapsed: (group: PaletteGroup, collapsed: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  bottomPanelOpen: true,
  codeViewMode: 'pipeline',
  rightPanelTab: 'inspector',
  highlightedColumn: null,
  saveStatus: 'idle',
  compareMode: null,
  isSharedImport: false,
  paramDialogOpen: false,
  exportDialogOpen: false,
  shareDialogOpen: false,
  versionDialogOpen: false,
  versionOpenSaveOnMount: false,
  helpDialogOpen: false,
  aboutDialogOpen: false,
  incompatibleDataDialogOpen: false,
  customPythonConfirmOpen: false,
  customPythonPendingPosition: null,
  paletteCollapseState: {},

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

  setCompareMode(mode) {
    set({ compareMode: mode });
  },

  setSharedImport(shared) {
    set({ isSharedImport: shared });
  },

  setParamDialogOpen(open) {
    set({ paramDialogOpen: open });
  },

  setExportDialogOpen(open) {
    set({ exportDialogOpen: open });
  },

  setShareDialogOpen(open) {
    set({ shareDialogOpen: open });
  },

  setVersionDialogOpen(open) {
    set({ versionDialogOpen: open });
  },

  setVersionOpenSaveOnMount(open) {
    set({ versionOpenSaveOnMount: open });
  },

  setHelpDialogOpen(open) {
    set({ helpDialogOpen: open });
  },

  setAboutDialogOpen(open) {
    set({ aboutDialogOpen: open });
  },

  setIncompatibleDataDialogOpen(open) {
    set({ incompatibleDataDialogOpen: open });
  },

  openCustomPythonConfirm(position) {
    set({ customPythonConfirmOpen: true, customPythonPendingPosition: position });
  },

  closeCustomPythonConfirm() {
    set({ customPythonConfirmOpen: false, customPythonPendingPosition: null });
  },

  setPaletteGroupCollapsed(group, collapsed) {
    set((state) => ({
      paletteCollapseState: { ...state.paletteCollapseState, [group]: collapsed },
    }));
  },
}));
