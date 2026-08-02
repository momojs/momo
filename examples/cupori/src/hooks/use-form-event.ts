import { useEffectEvent } from 'react';

export const useFormSubmit = <T = unknown>(
  handle: (meta?: T) => Promise<void>,
) => {
  return useEffectEvent(async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    await handle();
  });
};
