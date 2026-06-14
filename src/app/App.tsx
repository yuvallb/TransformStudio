import { Toaster } from '@/ui/components/ui/sonner';
import { CodeView } from '@/ui/CodeView';
import { FileDropzone } from '@/ui/FileDropzone';
import { Inspector } from '@/ui/Inspector';
import { PreviewGrid } from '@/ui/PreviewGrid';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/components/ui/tabs';

import { PyodideProvider } from '@/hooks/usePyodide';
import { useExecution } from '@/hooks/useExecution';
import { installTestBridge } from '@/test/bridge';
import { useUiStore } from '@/state/ui-store';
import { Footer } from './layout/Footer';
import { Header } from './layout/Header';
import { Sidebar } from './layout/Sidebar';

if (import.meta.env.DEV) {
  installTestBridge();
}

function Workspace() {
  useExecution();
  const bottomPanelOpen = useUiStore((s) => s.bottomPanelOpen);
  const rightPanelTab = useUiStore((s) => s.rightPanelTab);
  const setRightPanelTab = useUiStore((s) => s.setRightPanelTab);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
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
                onValueChange={(v) => setRightPanelTab(v as 'inspector' | 'code')}
                className="flex h-full flex-col"
              >
                <TabsList className="mx-2 mt-2 grid w-auto grid-cols-2">
                  <TabsTrigger value="inspector">Inspector</TabsTrigger>
                  <TabsTrigger value="code">Code</TabsTrigger>
                </TabsList>
                <TabsContent value="inspector" className="mt-0 min-h-0 flex-1 overflow-hidden">
                  <Inspector />
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
