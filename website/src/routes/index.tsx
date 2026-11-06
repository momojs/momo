import { createFileRoute } from '@tanstack/react-router';

import { Home, homeHead } from '@/components/home-page';

export const Route = createFileRoute('/')({
  head: () => homeHead(),
  component: Home,
});
