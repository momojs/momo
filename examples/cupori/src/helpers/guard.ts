import { Capacitor } from '@capacitor/core';

export const isWeb = () => Capacitor.getPlatform() === 'web';
