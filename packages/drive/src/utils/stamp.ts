import { nanoid } from 'nanoid';

export const stamp = () => nanoid().replace(/-/g, '').slice(0, 8);
