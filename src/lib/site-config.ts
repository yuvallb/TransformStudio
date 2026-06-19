export const SITE = {
  name: 'RefineIt',
  tagline: 'Visual data workflows that run in your browser',
  description:
    'RefineIt is a visual workspace for reusable data workflows. Users build transformations as interactive flow diagrams, execute them locally in the browser using Python and Pandas, and share or export them as reproducible assets without managing infrastructure.',
  privacyNote:
    'Imported datasets stay in your browser (IndexedDB). Shared links never include your files.',
  welcomeHint: 'Drop a CSV/JSON file anywhere on the canvas to start.',
  welcomeHintStorageKey: 'refineit.dismissedWelcomeHint',
  urls: {
    repo: 'https://github.com/yuvallb/RefineIt',
    issues: 'https://github.com/yuvallb/RefineIt/issues/new/choose',
    readme: 'https://github.com/yuvallb/RefineIt#readme',
    site: 'https://yuvallb.github.io/RefineIt/',
  },
  valueProps: [
    {
      title: 'Runs entirely in your browser',
      description:
        'Python/Pandas in a Web Worker; your data never leaves your machine.',
    },
    {
      title: 'Visual DAG builder',
      description: 'Drag, connect, and inspect live previews and column profiles.',
    },
    {
      title: 'Shareable logic',
      description: 'Workflow URLs contain configuration only, not your datasets.',
    },
    {
      title: 'Export-ready',
      description: 'Download as a Python script or Jupyter notebook.',
    },
  ],
  gettingStarted: [
    'Open a demo or import a file',
    'Connect nodes on the canvas',
    'Inspect preview, profile, and generated code',
    'Share workflow logic or export Python/notebook',
  ],
} as const;
