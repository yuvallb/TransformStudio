import { Github } from 'lucide-react';

import { SITE } from '@/lib/site-config';
import { useUiStore } from '@/state/ui-store';
import { BrandLogo } from '@/ui/BrandLogo';
import { SocialShareButtons } from '@/ui/SocialShareButtons';
import { Button } from '@/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/ui/components/ui/dialog';

export function AboutDialog() {
  const open = useUiStore((s) => s.aboutDialogOpen);
  const setOpen = useUiStore((s) => s.setAboutDialogOpen);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <BrandLogo size="md" />
            <div>
              <DialogTitle>{SITE.name}</DialogTitle>
              <DialogDescription>{SITE.tagline}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <section>
            <h3 className="mb-1 font-medium">What is RefineIt?</h3>
            <p className="text-muted-foreground">{SITE.description}</p>
          </section>

          <section>
            <h3 className="mb-2 font-medium">Why RefineIt?</h3>
            <ul className="space-y-2 text-muted-foreground">
              {SITE.valueProps.map((prop) => (
                <li key={prop.title}>
                  <span className="font-medium text-foreground">{prop.title}</span>
                  {' — '}
                  {prop.description}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="mb-1 font-medium">Privacy</h3>
            <p className="text-muted-foreground">{SITE.privacyNote}</p>
          </section>

          <section>
            <h3 className="mb-2 font-medium">Share RefineIt</h3>
            <SocialShareButtons />
          </section>

          <section className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href={SITE.urls.repo} target="_blank" rel="noopener noreferrer">
                <Github className="size-4" />
                View on GitHub
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={SITE.urls.issues} target="_blank" rel="noopener noreferrer">
                Report an issue
              </a>
            </Button>
          </section>

          <footer className="border-t border-border pt-3 text-xs text-muted-foreground">
            <p>v{__APP_VERSION__} · <a href={SITE.urls.license} target="_blank" rel="noopener noreferrer">{SITE.license}</a></p>
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AboutLink({ className }: { className?: string }) {
  const setOpen = useUiStore((s) => s.setAboutDialogOpen);

  return (
    <button
      type="button"
      className={className}
      onClick={() => setOpen(true)}
      aria-label="About RefineIt"
    >
      About
    </button>
  );
}
