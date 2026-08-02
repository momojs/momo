// Import the generated route tree

import { createRouter } from '@tanstack/react-router';

import type { FileRouteTypes } from './route.gen';
import { routeTree } from './route.gen';

// Create a new router instance
export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  scrollRestoration: true,
});

export type FileRoutePath = FileRouteTypes['to'];
