import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import { Drive, repeat } from '../index';

type ScenarioHandler = (
  attempt: number,
  request: Request,
) => Response | Promise<Response>;

type Scenario = {
  calls: number;
  handler: ScenarioHandler;
  url: string;
};

const scenarios = new Map<string, Scenario>();
let server: ReturnType<typeof Bun.serve> | undefined;

function respond(
  handler: ScenarioHandler = (attempt) => Response.json({ attempt }),
): Scenario {
  if (!server) throw new Error('repeat fixture server is not running');

  const id = crypto.randomUUID();
  const url = new URL('/users', server.url);
  url.searchParams.set('case', id);
  const scenario = { calls: 0, handler, url: url.href };
  scenarios.set(id, scenario);
  return scenario;
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  const deadline = performance.now() + 2_000;
  while (!predicate()) {
    if (performance.now() >= deadline) {
      throw new Error('timed out waiting for repeat fixture');
    }
    await Bun.sleep(5);
  }
}

beforeAll(() => {
  server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    fetch(request) {
      const id = new URL(request.url).searchParams.get('case');
      const scenario = id ? scenarios.get(id) : undefined;
      if (!scenario)
        return new Response('Unknown test scenario', { status: 404 });

      scenario.calls += 1;
      return scenario.handler(scenario.calls, request);
    },
  });
});

afterAll(() => {
  server?.stop(true);
  scenarios.clear();
});

describe('repeat send stage', () => {
  test('sends once when eligible is omitted', async () => {
    const fixture = respond();
    const drive = new Drive({ stages: { send: repeat({}) } });

    const body = await drive.get<{ attempt: number }>(fixture.url);

    expect(fixture.calls).toBe(1);
    expect(body).toEqual({ attempt: 1 });
  });

  test('repeats while eligible returns true and parses the final response', async () => {
    const fixture = respond();
    const attempts: number[] = [];
    const drive = new Drive({
      stages: {
        send: repeat({
          eligible: (attempt) => {
            attempts.push(attempt);
            return attempt < 3;
          },
        }),
      },
    });

    const body = await drive.get<{ attempt: number }>(fixture.url);

    expect(fixture.calls).toBe(3);
    expect(attempts).toEqual([1, 2, 3]);
    expect(body).toEqual({ attempt: 3 });
  });

  test('provides the encoded request snapshot to eligible', async () => {
    const fixture = respond();
    const snapshots: Array<{ api: string; method?: string }> = [];
    const drive = new Drive({
      stages: {
        send: repeat({
          eligible: (attempt, context) => {
            snapshots.push({ api: context.api, method: context.req.method });
            return context.path === '/users' && attempt < 2;
          },
        }),
      },
    });

    await drive.get(fixture.url, new URLSearchParams({ page: '2' }));

    expect(fixture.calls).toBe(2);
    expect(snapshots.map(({ method }) => method)).toEqual(['GET', 'GET']);
    for (const { api } of snapshots) {
      const encoded = new URL(api);
      expect(encoded.pathname).toBe('/users');
      expect(encoded.searchParams.get('page')).toBe('2');
      expect(encoded.searchParams.get('case')).toBe(
        new URL(fixture.url).searchParams.get('case'),
      );
    }
  });

  test('provides current response metadata to eligible', async () => {
    const fixture = respond((attempt) =>
      Response.json(
        { attempt },
        {
          status: attempt === 1 ? 401 : 200,
          headers: { 'X-Trace': String(attempt) },
        },
      ),
    );
    const responses: Array<{
      status?: number;
      trace?: string | null;
      rawStatus?: number;
    }> = [];
    const drive = new Drive({
      stages: {
        send: repeat({
          eligible: (_attempt, context) => {
            responses.push({
              status: context.res.status,
              trace: context.res.headers?.get('X-Trace'),
              rawStatus: context.res.raw?.status,
            });
            return context.res.status === 401;
          },
        }),
      },
    });

    const body = await drive.get<{ attempt: number }>(fixture.url);

    expect(fixture.calls).toBe(2);
    expect(responses).toEqual([
      { status: 401, trace: '1', rawStatus: 401 },
      { status: 200, trace: '2', rawStatus: 200 },
    ]);
    expect(body).toEqual({ attempt: 2 });
  });

  test('allows eligible to inspect a cloned response body', async () => {
    const fixture = respond((attempt) =>
      Response.json({ repeat: attempt === 1, attempt }),
    );
    const drive = new Drive({
      stages: {
        send: repeat({
          eligible: async (_attempt, context) => {
            const body = await context.res.raw?.clone().json();
            return body?.repeat === true;
          },
        }),
      },
    });

    const body = await drive.get<{ repeat: boolean; attempt: number }>(
      fixture.url,
    );

    expect(fixture.calls).toBe(2);
    expect(body).toEqual({ repeat: false, attempt: 2 });
  });

  test('discards the response when eligible throws', async () => {
    const fixture = respond();
    const failure = new Error('eligibility failed');
    let response: Response | undefined;
    const drive = new Drive({
      stages: {
        send: repeat({
          eligible: (_attempt, context) => {
            response = context.res.raw;
            throw failure;
          },
        }),
      },
    });

    await expect(drive.get(fixture.url)).rejects.toBe(failure);
    expect(fixture.calls).toBe(1);
    expect(response?.bodyUsed).toBe(true);
  });

  test('resolves delay only between attempts', async () => {
    const fixture = respond();
    const delays: Array<{ attempt: number; path: string }> = [];
    const drive = new Drive({
      stages: {
        send: repeat({
          eligible: async (attempt) => attempt < 3,
          delay: (attempt, context) => {
            delays.push({ attempt, path: context.path });
            return 0;
          },
        }),
      },
    });

    await drive.get(fixture.url);

    expect(fixture.calls).toBe(3);
    expect(delays).toEqual([
      { attempt: 1, path: '/users' },
      { attempt: 2, path: '/users' },
    ]);
  });

  test('uses the eligible snapshot when resolving delay', async () => {
    const fixture = respond();
    let eligibleSnapshot: unknown;
    let delaySnapshot: unknown;
    const drive = new Drive({
      stages: {
        send: repeat({
          eligible: (attempt, context) => {
            if (attempt === 1) eligibleSnapshot = context;
            return attempt < 2;
          },
          delay: (_attempt, context) => {
            delaySnapshot = context;
            return 0;
          },
        }),
      },
    });

    await drive.get(fixture.url);

    expect(delaySnapshot).toBe(eligibleSnapshot);
  });

  test('discards the response when delay throws', async () => {
    const fixture = respond();
    const failure = new Error('delay failed');
    let response: Response | undefined;
    const drive = new Drive({
      stages: {
        send: repeat({
          eligible: (_attempt, context) => {
            response = context.res.raw;
            return true;
          },
          delay: () => {
            throw failure;
          },
        }),
      },
    });

    await expect(drive.get(fixture.url)).rejects.toBe(failure);
    expect(fixture.calls).toBe(1);
    expect(response?.bodyUsed).toBe(true);
  });

  test('cancels an unread intermediate response body', async () => {
    const fixture = respond((attempt) =>
      Response.json({ attempt }, { status: attempt === 1 ? 503 : 200 }),
    );
    let intermediate: Response | undefined;
    const drive = new Drive({
      stages: {
        send: repeat({
          eligible: (_attempt, context) => {
            if (context.res.status === 503) intermediate = context.res.raw;
            return context.res.status === 503;
          },
        }),
      },
    });

    await drive.get(fixture.url);

    expect(fixture.calls).toBe(2);
    expect(intermediate?.bodyUsed).toBe(true);
  });

  test('does not wait for an abandoned response clone to be cancelled', async () => {
    const fixture = respond((attempt) => {
      if (attempt > 1) return Response.json({ attempt });
      return new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(Uint8Array.of(1));
          },
        }),
      );
    });
    let clone: Response | undefined;
    const drive = new Drive({
      stages: {
        send: repeat({
          eligible: (attempt, context) => {
            if (attempt === 1) clone = context.res.raw?.clone();
            return attempt < 2;
          },
        }),
      },
    });

    const request = drive.get(fixture.url);
    await waitUntil(() => fixture.calls === 2);
    const callsBeforeReleasingClone = fixture.calls;
    await clone?.body?.cancel();
    await request;

    expect(callsBeforeReleasingClone).toBe(2);
  });

  test('aborts while waiting for the next attempt', async () => {
    const fixture = respond();
    const controller = new AbortController();
    const drive = new Drive({
      stages: {
        send: repeat({
          eligible: (attempt) => attempt < 2,
          delay: () => {
            queueMicrotask(() => controller.abort(new Error('stopped')));
            return 60_000;
          },
        }),
      },
    });

    await expect(
      drive.get(fixture.url, undefined, { signal: controller.signal }),
    ).rejects.toThrow('stopped');
    expect(fixture.calls).toBe(1);
  });

  test('rejects before sending when the request signal is already aborted', async () => {
    const fixture = respond();
    const controller = new AbortController();
    const failure = new Error('already stopped');
    let eligibleCalls = 0;
    controller.abort(failure);
    const drive = new Drive({
      stages: {
        send: repeat({
          eligible: () => {
            eligibleCalls += 1;
            return true;
          },
        }),
      },
    });

    await expect(
      drive.get(fixture.url, undefined, { signal: controller.signal }),
    ).rejects.toBe(failure);
    expect(fixture.calls).toBe(0);
    expect(eligibleCalls).toBe(0);
  });

  test('propagates a later fetch rejection without evaluating eligible again', async () => {
    const fixture = respond();
    const attempts: number[] = [];
    const drive = new Drive({
      stages: {
        send: repeat({
          eligible: (attempt) => {
            attempts.push(attempt);
            return true;
          },
          effect: (_attempt, context) => {
            context.api = 'http://[invalid';
          },
        }),
      },
    });

    await expect(drive.get(fixture.url)).rejects.toBeInstanceOf(TypeError);
    expect(fixture.calls).toBe(1);
    expect(attempts).toEqual([1]);
  });

  test('rejects rather than replaying a consumed ReadableStream request body', async () => {
    const uploads: string[] = [];
    const fixture = respond(async (attempt, request) => {
      uploads.push(await request.text());
      return Response.json({ attempt });
    });
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('one shot'));
        controller.close();
      },
    });
    const drive = new Drive({
      stages: {
        send: repeat({ eligible: (attempt) => attempt < 2 }),
      },
    });

    await expect(
      drive.post(fixture.url, undefined, { body }),
    ).rejects.toThrow();
    expect(fixture.calls).toBe(1);
    expect(uploads).toEqual(['one shot']);
  });

  test('repeats a one-shot body when effect supplies a fresh stream', async () => {
    const uploads: string[] = [];
    const fixture = respond(async (attempt, request) => {
      uploads.push(await request.text());
      return Response.json({ attempt });
    });
    const stream = (value: string) =>
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(value));
          controller.close();
        },
      });
    const drive = new Drive({
      stages: {
        send: repeat({
          eligible: (attempt) => attempt < 2,
          effect: (_attempt, context) => {
            context.req.body = stream('second');
          },
        }),
      },
    });

    const body = await drive.post<{ attempt: number }>(fixture.url, undefined, {
      body: stream('first'),
    });

    expect(body).toEqual({ attempt: 2 });
    expect(fixture.calls).toBe(2);
    expect(uploads).toEqual(['first', 'second']);
  });

  test('awaits effect before delay and applies mutations to the next send', async () => {
    const order: string[] = [];
    const fixture = respond((attempt, request) => {
      order.push(
        `fetch:${attempt}:${request.headers.get('Authorization') ?? 'none'}`,
      );
      return Response.json({ attempt });
    });
    const drive = new Drive({
      stages: {
        send: repeat({
          eligible: (attempt) => {
            order.push(`eligible:${attempt}`);
            return attempt < 2;
          },
          effect: async (attempt, context) => {
            await Promise.resolve();
            order.push(`effect:${attempt}`);
            context.req.headers.set('Authorization', 'Bearer refreshed');
          },
          delay: (attempt) => {
            order.push(`delay:${attempt}`);
            return 0;
          },
        }),
      },
    });

    await drive.get(fixture.url);

    expect(order).toEqual([
      'fetch:1:none',
      'eligible:1',
      'effect:1',
      'delay:1',
      'fetch:2:Bearer refreshed',
      'eligible:2',
    ]);
  });

  test('propagates effect errors without starting another send', async () => {
    const fixture = respond();
    const failure = new Error('refresh failed');
    let response: Response | undefined;
    const drive = new Drive({
      stages: {
        send: repeat({
          eligible: (_attempt, context) => {
            response = context.res.raw;
            return true;
          },
          effect: () => {
            throw failure;
          },
        }),
      },
    });

    await expect(drive.get(fixture.url)).rejects.toBe(failure);
    expect(fixture.calls).toBe(1);
    expect(response?.bodyUsed).toBe(true);
  });

  test('can be supplied as a per-request send stage', async () => {
    const fixture = respond();
    const drive = new Drive();

    await drive.get(fixture.url, undefined, {
      stages: {
        send: repeat({ eligible: (attempt) => attempt < 2 }),
      },
    });

    expect(fixture.calls).toBe(2);
  });
});
