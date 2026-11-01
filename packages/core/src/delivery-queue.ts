import { isFunction } from 'remeda';

import { isSafeInteger } from './guard/isSafeInteger.js';

/** 发送队首批次；兑现即整批确认，返回值不参与确认判断。 */
export type DeliveryRequest<T> = (items: readonly T[]) => Promise<unknown>;

/** 同步计算下一批的队首条数，返回 1 到候选长度之间的整数。 */
export type DeliveryPartition<T> = (candidates: readonly T[]) => number;

/** 未确认发送队列的容量、发送函数与分批策略。 */
export interface DeliveryQueueOptions<T> {
  /** 未确认条目上限；默认 Infinity，也可传入正安全整数。 */
  capacity?: number;
  /** 发送函数；未提供时可稍后通过 configure 绑定。 */
  request?: DeliveryRequest<T>;
  /** 每批开始前计算队首分界点；默认取完当前候选前缀。 */
  partition?: DeliveryPartition<T>;
}

interface QueueItem<T> {
  readonly value: T;
  next: QueueItem<T> | undefined;
}

interface FlushTarget<T> {
  readonly item: QueueItem<T>;
  readonly promise: Promise<void>;
  readonly resolve: () => void;
  readonly reject: (error: unknown) => void;
  next: FlushTarget<T> | undefined;
}

function createTarget<T>(item: QueueItem<T>): FlushTarget<T> {
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<void>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { item, promise, resolve, reject, next: undefined };
}

/**
 * 持有未确认条目的 FIFO 队列，串行发送队首批次，确认后才消费。
 *
 * enqueue 只完成内存接纳，configure 只绑定发送函数。每次 flush 固定
 * 调用时的队尾边界；重叠调用共享发送过程，各自等待自己的边界确认。
 * 一批失败时保留未确认条目，拒绝所有未完成调用，不自动重试。
 *
 * @example
 * const queue = new DeliveryQueue<string>({
 *   request: async (items) => saveItems(items),
 *   partition: (items) => Math.min(20, items.length),
 * });
 * queue.enqueue('momo');
 * await queue.flush();
 */
export class DeliveryQueue<T> {
  private readonly capacity: number;
  private readonly partition: DeliveryPartition<T> | undefined;
  private request: DeliveryRequest<T> | undefined;
  private head: QueueItem<T> | undefined;
  private tail: QueueItem<T> | undefined;
  private count = 0;
  private pending: FlushTarget<T> | undefined;
  private lastPending: FlushTarget<T> | undefined;

  /**
   * 创建内存发送队列，不启动发送。
   * @param options 容量、可选发送函数和同步分批策略。
   * @throws {TypeError} 容量不是数字，或显式提供的 partition 不是函数。
   * @throws {RangeError} 容量不是正安全整数或 Infinity。
   */
  constructor({
    request,
    partition,
    capacity = Infinity,
  }: DeliveryQueueOptions<T> = {}) {
    if (partition !== undefined && !isFunction(partition)) {
      throw new TypeError('Delivery partition must be a function');
    }
    if (typeof capacity !== 'number') {
      throw new TypeError('Delivery capacity must be a number');
    }
    if (capacity === Infinity || isSafeInteger(capacity, { min: 1 })) {
      this.capacity = capacity;
      this.partition = partition;
      if (request !== undefined) this.configure(request);
    } else {
      throw new RangeError(
        'Delivery capacity must be a positive safe integer or Infinity',
      );
    }
  }

  /** 全部未确认条目数，包含在途批次。 */
  get size(): number {
    return this.count;
  }

  /** 是否已达到接纳容量。 */
  get full(): boolean {
    return this.count >= this.capacity;
  }

  /** 是否已绑定发送函数。 */
  get configured(): boolean {
    return this.request !== undefined;
  }

  /** 是否存在等待确认的 flush，包括尚未启动的发送过程。 */
  get reporting(): boolean {
    return this.pending !== undefined;
  }

  /**
   * 同步接纳一个条目，不触发发送，不复制或冻结条目本身。
   * @param item 待接纳条目，保留其原值及引用。
   * @returns true 表示已进入内存队列；容量已满时返回 false。
   * @example queue.enqueue({ type: 'click' });
   */
  enqueue(item: T): boolean {
    if (!this.full) {
      const entry: QueueItem<T> = { value: item, next: undefined };
      if (this.tail) this.tail.next = entry;
      else this.head = entry;
      this.tail = entry;
      this.count += 1;
      return true;
    } else {
      return false;
    }
  }

  /**
   * 绑定发送函数，不发送已接纳的条目。
   * @param request 兑现表示整批确认，拒绝或同步抛错表示本批失败。
   * 调用方负责提供有效函数，并避免在发送过程中替换绑定。
   * @example queue.configure(async (items) => saveItems(items));
   */
  configure(request: DeliveryRequest<T>): void {
    this.request = request;
  }

  /**
   * 发送并等待调用时已接纳的条目全部确认，发送在微任务中启动。
   *
   * 后续入队的条目需要新的 flush。各调用保留自己的确认边界，批次
   * 不越过最早未完成的边界。失败时停止发送，保留未确认条目，并以
   * 原错误拒绝全部未完成调用；下一次 flush 可显式重试。
   *
   * @returns 边界内全部条目确认后兑现；空队列直接兑现。非空但未配置、
   * 分批非法、回调抛错或发送拒绝时拒绝，已确认的批次不回滚。
   * @example await queue.flush();
   */
  flush(): Promise<void> {
    const { tail, lastPending, request } = this;
    if (tail && request) {
      if (lastPending?.item === tail) {
        return lastPending.promise;
      } else {
        const target = createTarget(tail);
        if (this.lastPending) this.lastPending.next = target;
        else this.pending = target;
        this.lastPending = target;
        if (!lastPending) {
          void Promise.resolve().then(() => this.deliver(request));
        }
        return target.promise;
      }
    } else if (tail) {
      return Promise.reject(new Error('Delivery request is not configured'));
    } else {
      return Promise.resolve();
    }
  }

  private candidates(target: QueueItem<T>): readonly T[] {
    const items: T[] = [];
    let entry = this.head;
    while (entry) {
      items.push(entry.value);
      if (entry === target) break;
      entry = entry.next;
    }
    return Object.freeze(items);
  }

  private consume(count: number): void {
    for (let index = 0; index < count; index += 1) {
      this.head = this.head!.next;
    }
    this.count -= count;
    if (!this.head) this.tail = undefined;
  }

  private async deliver(request: DeliveryRequest<T>): Promise<void> {
    try {
      while (this.pending) {
        const target = this.pending;
        const candidates = this.candidates(target.item);
        const partition = this.partition;
        const count = partition ? partition(candidates) : candidates.length;
        if (isSafeInteger(count, { min: 1, max: candidates.length })) {
          await request(Object.freeze(candidates.slice(0, count)));
          this.consume(count);
          if (count === candidates.length) {
            this.pending = target.next;
            if (!this.pending) this.lastPending = undefined;
            target.next = undefined;
            target.resolve();
          }
        } else {
          throw new RangeError(
            'Delivery partition must return an integer between 1 and the candidate length',
          );
        }
      }
    } catch (error) {
      // 先结束旧等待关系，调用方才能在拒绝回调中安全地发起重试。
      let target = this.pending;
      this.pending = undefined;
      this.lastPending = undefined;
      while (target) {
        const { next } = target;
        target.next = undefined;
        target.reject(error);
        target = next;
      }
    }
  }
}
