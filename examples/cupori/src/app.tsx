/**
 * This file is the entry point for the React app, it sets up the root
 * element and renders the App component to the DOM.
 *
 * It is included in `src/index.html`.
 */

import { StrictMode } from 'react';

import { RouterProvider } from '@tanstack/react-router';

import { createRoot } from 'react-dom/client';

import { router } from '@/stores/route';

import './app.css';

import { QueryClientProvider } from '@tanstack/react-query';

import { applyThemeMode } from './stores/app';
import { applyDocumentLocale, useLocaleStore } from './stores/locale';
import { queryClient } from './stores/query';

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

applyThemeMode();
applyDocumentLocale();

const elem = document.getElementById('root')!;

function App() {
  const locale = useLocaleStore((state) => state.locale);

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider key={locale} router={router} />
    </QueryClientProvider>
  );
}

const app = (
  <StrictMode>
    <App />
  </StrictMode>
);

// https://bun.com/docs/bundler/hot-reloading#import-meta-hot-data
// biome-ignore lint/suspicious/noAssignInExpressions: <app.tsx>
(import.meta.hot.data.root ??= createRoot(elem)).render(app);

// Explicitly make the HTML entrypoint an HMR boundary for the module graph above.
import.meta.hot.accept();
