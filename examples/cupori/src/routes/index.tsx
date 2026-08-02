import { useEffect } from 'react';

import { createFileRoute, useRouter } from '@tanstack/react-router';

import { m } from '@/paraglide/messages.js';

export const Route = createFileRoute('/')({
  component: Index,
});

function Index() {
  const { navigate } = useRouter();

  useEffect(() => {
    navigate({ to: '/calendar' });
  }, []);

  return (
    <div className='p-2'>
      <h3>{m.home_opening_calendar()}</h3>
    </div>
  );
}
