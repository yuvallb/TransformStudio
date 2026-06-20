import { CUSTOM_PYTHON_ENABLED } from '@/lib/constants';
import type { NodeType } from '@/lib/types';
import { useUiStore } from '@/state/ui-store';
import { useWorkflowStore } from '@/state/workflow-store';

export const CUSTOM_PYTHON_ACK_KEY = 'refineit.customPythonAcknowledged';

export function isCustomPythonAcknowledged(): boolean {
  try {
    return localStorage.getItem(CUSTOM_PYTHON_ACK_KEY) === 'true';
  } catch {
    return false;
  }
}

export function acknowledgeCustomPython(): void {
  try {
    localStorage.setItem(CUSTOM_PYTHON_ACK_KEY, 'true');
  } catch {
    // localStorage may be unavailable in private mode
  }
}

export function requestAddNode(type: NodeType, position: { x: number; y: number }): void {
  if (type === 'custom.python' && CUSTOM_PYTHON_ENABLED && !isCustomPythonAcknowledged()) {
    useUiStore.getState().openCustomPythonConfirm(position);
    return;
  }
  useWorkflowStore.getState().addNode(type, position);
}
