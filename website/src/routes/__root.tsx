import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from '@tanstack/react-router';

import { MotionUIThemeProvider } from '@momots/design/motion';
import { RootProvider } from 'fumadocs-ui/provider/tanstack';

import SearchDialog from '@/components/search';
import motionTheme from '@/motion.theme';
import appCss from '@/styles/app.css?url';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'momo',
      },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <html className='theme-neutral' suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className='flex flex-col min-h-screen'>
        <MotionUIThemeProvider theme={motionTheme}>
          <RootProvider search={{ SearchDialog }}>
            <Outlet />
          </RootProvider>
        </MotionUIThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}
