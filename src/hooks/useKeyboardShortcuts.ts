import { useEffect } from 'react';

import { useUiStore } from '@/state/ui-store';
import { useWorkflowStore } from '@/state/workflow-store';

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return target.isContentEditable;
}

export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;

      const mod = event.metaKey || event.ctrlKey;
      if (!mod) return;

      if (event.key === 's' || event.key === 'S') {
        event.preventDefault();
        useUiStore.getState().setVersionOpenSaveOnMount(true);
        useUiStore.getState().setVersionDialogOpen(true);
        return;
      }

      if (event.key === 'z' || event.key === 'Z') {
        event.preventDefault();
        if (event.shiftKey) {
          useWorkflowStore.getState().redo();
        } else {
          useWorkflowStore.getState().undo();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
