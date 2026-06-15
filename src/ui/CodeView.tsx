import { useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';

import { generateNodeCode, generatePipelineCode } from '@/engine/codegen';
import { useUiStore } from '@/state/ui-store';
import { useWorkflowStore } from '@/state/workflow-store';

export function CodeView() {
  const workflow = useWorkflowStore((s) => s.workflow);
  const selectedNodeId = useWorkflowStore((s) => s.selectedNodeId);
  const codeViewMode = useUiStore((s) => s.codeViewMode);
  const setCodeViewMode = useUiStore((s) => s.setCodeViewMode);

  const code = useMemo(() => {
    if (codeViewMode === 'node' && selectedNodeId) {
      return generateNodeCode(selectedNodeId, workflow);
    }
    return generatePipelineCode(workflow);
  }, [codeViewMode, selectedNodeId, workflow]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-1 border-b border-border p-2">
        <button
          type="button"
          onClick={() => setCodeViewMode('node')}
          aria-label="Show node code"
          aria-pressed={codeViewMode === 'node'}
          className={`rounded px-2 py-1 text-xs ${codeViewMode === 'node' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
          disabled={!selectedNodeId}
        >
          Node code
        </button>
        <button
          type="button"
          onClick={() => setCodeViewMode('pipeline')}
          aria-label="Show full pipeline code"
          aria-pressed={codeViewMode === 'pipeline'}
          className={`rounded px-2 py-1 text-xs ${codeViewMode === 'pipeline' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
        >
          Full pipeline
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <CodeMirror
          value={code || '# Add nodes to generate code'}
          extensions={[python()]}
          editable={false}
          basicSetup={{ lineNumbers: true, foldGutter: true }}
          className="h-full text-xs"
        />
      </div>
    </div>
  );
}
