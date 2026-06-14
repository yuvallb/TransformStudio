import { create } from 'zustand';

export type CodeViewMode = 'node' | 'pipeline';

interface UiState {
  bottomPanelOpen: boolean;
  codeViewMode: CodeViewMode;
  rightPanelTab: 'inspector' | 'code';

  setBottomPanelOpen: (open: boolean) => void;
  setCodeViewMode: (mode: CodeViewMode) => void;
  setRightPanelTab: (tab: 'inspector' | 'code') => void;
}

export const useUiStore = create<UiState>((set) => ({
  bottomPanelOpen: true,
  codeViewMode: 'pipeline',
  rightPanelTab: 'inspector',

  setBottomPanelOpen(open) {
    set({ bottomPanelOpen: open });
  },

  setCodeViewMode(mode) {
    set({ codeViewMode: mode });
  },

  setRightPanelTab(tab) {
    set({ rightPanelTab: tab });
  },
}));
