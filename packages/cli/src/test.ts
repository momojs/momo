/**
 * 一个无依赖、可在浏览器环境（Bun.WebView）中运行的轻量测试框架。
 *
 * spec 文件从 `@momots/cli/test` 导入 `describe` / `test` / `expect`，
 * CLI 会把它们和 spec 一起打包进 WebView 执行，再通过 `run()` 收集结果，
 * 因此无需在每个 spec 里手写 bundle / WebView / evaluate 的样板代码。
 */

export type Hook = () => void | Promise<void>;
export type TestFn = () => void | Promise<void>;

interface TestNode {
  readonly kind: 'test';
  readonly name: string;
  readonly fn: TestFn;
  readonly skip: boolean;
  readonly only: boolean;
}

interface SuiteNode {
  readonly kind: 'suite';
  readonly name: string;
  readonly parent?: SuiteNode;
  readonly children: Array<SuiteNode | TestNode>;
  readonly beforeAll: Hook[];
  readonly afterAll: Hook[];
  readonly beforeEach: Hook[];
  readonly afterEach: Hook[];
}

export interface SerializedError {
  readonly message: string;
  readonly stack?: string;
}

export interface TestResult {
  readonly name: string;
  readonly status: 'passed' | 'failed' | 'skipped';
  readonly duration: number;
  readonly error?: SerializedError;
}

/** Istanbul `globalThis.__coverage__` 的 JSON 形态。 */
export type CoverageMapData = Record<string, Record<string, unknown>>;

export interface RunResult {
  readonly total: number;
  readonly passed: number;
  readonly failed: number;
  readonly skipped: number;
  readonly results: TestResult[];
  readonly coverage?: CoverageMapData;
}

function createSuite(name: string, parent?: SuiteNode): SuiteNode {
  return {
    kind: 'suite',
    name,
    parent,
    children: [],
    beforeAll: [],
    afterAll: [],
    beforeEach: [],
    afterEach: [],
  };
}

const root = createSuite('');
let current = root;

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

export function describe(name: string, fn: () => void): void {
  const suite = createSuite(name, current);
  current.children.push(suite);
  const previous = current;
  current = suite;
  try {
    fn();
  } finally {
    current = previous;
  }
}

function register(
  name: string,
  fn: TestFn,
  flags: { skip?: boolean; only?: boolean } = {},
): void {
  current.children.push({
    kind: 'test',
    name,
    fn,
    skip: flags.skip ?? false,
    only: flags.only ?? false,
  });
}

export function test(name: string, fn: TestFn): void {
  register(name, fn);
}
test.skip = (name: string, fn: TestFn): void =>
  register(name, fn, { skip: true });
test.only = (name: string, fn: TestFn): void =>
  register(name, fn, { only: true });

export const it = test;

export function beforeAll(hook: Hook): void {
  current.beforeAll.push(hook);
}
export function afterAll(hook: Hook): void {
  current.afterAll.push(hook);
}
export function beforeEach(hook: Hook): void {
  current.beforeEach.push(hook);
}
export function afterEach(hook: Hook): void {
  current.afterEach.push(hook);
}

function hasOnly(suite: SuiteNode): boolean {
  return suite.children.some((child) =>
    child.kind === 'test' ? child.only : hasOnly(child),
  );
}

async function runSuite(
  suite: SuiteNode,
  prefix: string,
  beforeEachChain: Hook[],
  afterEachChain: Hook[],
  onlyMode: boolean,
  results: TestResult[],
): Promise<void> {
  const path = prefix
    ? suite.name
      ? `${prefix} > ${suite.name}`
      : prefix
    : suite.name;

  for (const hook of suite.beforeAll) await hook();

  const nextBeforeEach = [...beforeEachChain, ...suite.beforeEach];
  const nextAfterEach = [...suite.afterEach, ...afterEachChain];

  for (const child of suite.children) {
    if (child.kind === 'suite') {
      await runSuite(
        child,
        path,
        nextBeforeEach,
        nextAfterEach,
        onlyMode,
        results,
      );
      continue;
    }

    const name = path ? `${path} > ${child.name}` : child.name;

    if (child.skip || (onlyMode && !child.only)) {
      results.push({ name, status: 'skipped', duration: 0 });
      continue;
    }

    const start = now();
    try {
      for (const hook of nextBeforeEach) await hook();
      await child.fn();
      for (const hook of nextAfterEach) await hook();
      results.push({ name, status: 'passed', duration: now() - start });
    } catch (error) {
      results.push({
        name,
        status: 'failed',
        duration: now() - start,
        error: serializeError(error),
      });
    }
  }

  for (const hook of suite.afterAll) await hook();
}

function serializeError(error: unknown): SerializedError {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack };
  }
  return { message: String(error) };
}

/** 执行所有已注册的测试，返回可被 JSON 序列化的结果。 */
export async function run(): Promise<RunResult> {
  const results: TestResult[] = [];
  await runSuite(root, '', [], [], hasOnly(root), results);

  return {
    total: results.length,
    passed: results.filter((result) => result.status === 'passed').length,
    failed: results.filter((result) => result.status === 'failed').length,
    skipped: results.filter((result) => result.status === 'skipped').length,
    results,
  };
}

/** 清空注册表，主要用于测试本框架自身。 */
export function reset(): void {
  root.children.length = 0;
  root.beforeAll.length = 0;
  root.afterAll.length = 0;
  root.beforeEach.length = 0;
  root.afterEach.length = 0;
  current = root;
}

export { expect } from './expect';
