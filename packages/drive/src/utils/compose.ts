export type Next = () => Promise<void>;

export type Middleware<T> = (context: T, next: Next) => void | Promise<void>;

export function compose<T>(
  middlewares: Middleware<T>[],
): (context: T, next?: Next) => Promise<void> {
  return function (context: T, next?: Next) {
    let offset = -1;

    function dispatch(index: number): Promise<void> {
      if (index <= offset) {
        return Promise.reject(new Error('next() called multiple times'));
      }

      offset = index;

      if (index === middlewares.length) {
        return Promise.resolve(next?.());
      }

      const middleware = middlewares[index];
      if (!middleware) return Promise.resolve();

      return Promise.resolve(
        middleware(context, dispatch.bind(null, index + 1)),
      );
    }

    return dispatch(0);
  };
}
