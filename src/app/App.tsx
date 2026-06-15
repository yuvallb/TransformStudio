import { Toaster } from '@/ui/components/ui/sonner';
import { CodeView } from '@/ui/CodeView';
import { FileDropzone } from '@/ui/FileDropzone';
import { Inspector } from '@/ui/Inspector';
import { PreviewGrid } from '@/ui/PreviewGrid';
import { ProfilePanel } from '@/ui/ProfilePanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/components/ui/tabs';

import { PyodideProvider } from '@/hooks/usePyodide';
import { useExecution } from '@/hooks/useExecution';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useWorkflow } from '@/hooks/useWorkflow';
import { installTestBridge } from '@/test/bridge';
import { useUiStore } from '@/state/ui-store';
import { useWorkflowStore } from '@/state/workflow-store';
import { GraphErrorBanner } from '@/ui/GraphErrorBanner';
import { Footer } from './layout/Footer';
import { Header } from './layout/Header';
import { Sidebar } from './layout/Sidebar';

if (import.meta.env.DEV) {
  installTestBridge();
}

function Workspace() {
  useWorkflow();
  useExecution();
  useKeyboardShortcuts();
  const isHydrated = useWorkflowStore((s) => s.isHydrated);
  const bottomPanelOpen = useUiStore((s) => s.bottomPanelOpen);
  const rightPanelTab = useUiStore((s) => s.rightPanelTab);
  const setRightPanelTab = useUiStore((s) => s.setRightPanelTab);

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      {!isHydrated && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          aria-busy="true"
          aria-label="Restoring workflow"
        >
          <p className="text-sm text-muted-foreground">Restoring workflow…</p>
        </div>
      )}
      <GraphErrorBanner />
      <Header />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1">
            <main className="min-w-0 flex-1 bg-muted/20">
              <FileDropzone />
            </main>
            <aside className="flex w-80 shrink-0 flex-col border-l border-border bg-card">
              <Tabs
                value={rightPanelTab}
                onValueChange={(v) => setRightPanelTab(v as 'inspector' | 'profile' | 'code')}
                className="flex h-full flex-col"
              >
                <TabsList className="mx-2 mt-2 grid w-auto grid-cols-3">
                  <TabsTrigger value="inspector">Inspector</TabsTrigger>
                  <TabsTrigger value="profile">Profile</TabsTrigger>
                  <TabsTrigger value="code">Code</TabsTrigger>
                </TabsList>
                <TabsContent value="inspector" className="mt-0 min-h-0 flex-1 overflow-hidden">
                  <Inspector />
                </TabsContent>
                <TabsContent value="profile" className="mt-0 min-h-0 flex-1 overflow-hidden">
                  <ProfilePanel />
                </TabsContent>
                <TabsContent value="code" className="mt-0 min-h-0 flex-1 overflow-hidden">
                  <CodeView />
                </TabsContent>
              </Tabs>
            </aside>
          </div>
          {bottomPanelOpen && (
            <div className="h-56 shrink-0 border-t border-border bg-card">
              <PreviewGrid />
            </div>
          )}
        </div>
      </div>
      <Footer />
      <Toaster />
    </div>
  );
}

export function App() {
  return (
    <PyodideProvider>
      <Workspace />
    </PyodideProvider>
  );
}
