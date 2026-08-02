import { Fragment } from 'react';

import { createRootRoute, Outlet } from '@tanstack/react-router';

export const Route = createRootRoute({
  component: Root,
});

function Root() {
  return (
    <Fragment>
      <Outlet />
      {/* <TanStackRouterDevtools /> */}
    </Fragment>
  );
}
