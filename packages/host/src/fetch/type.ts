export type FetchMethod =
  | 'GET'
  | 'PUT'
  | 'POST'
  | 'HEAD'
  | 'TRACE'
  | 'PATCH'
  | 'DELETE'
  | 'CONNECT'
  | 'OPTIONS';

export const methods: readonly FetchMethod[] = [
  'GET',
  'PUT',
  'POST',
  'HEAD',
  'TRACE',
  'PATCH',
  'DELETE',
  'CONNECT',
  'OPTIONS',
];
