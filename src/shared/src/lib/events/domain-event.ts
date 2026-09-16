/**
 * DOMAIN EVENTS (Local, Synchronous, In-Memory)
 *
 * @usage Use this for immediate side effects within the SAME module/feature.
 * @rules NEVER cross module boundaries. Handled synchronously.
 */
export interface DomainEvent<TPayload = unknown> {
  readonly name: string;
  readonly payload: TPayload;
  readonly occurredAt: Date;
}

type Handler<T> = (event: DomainEvent<T>) => void | Promise<void>;

export class DomainEventDispatcher {
  private handlers = new Map<string, Handler<unknown>[]>();

  on<T>(eventName: string, handler: Handler<T>): void {
    const list = this.handlers.get(eventName) ?? [];
    list.push(handler as Handler<unknown>);
    this.handlers.set(eventName, list);
  }

  async dispatch(event: DomainEvent): Promise<void> {
    const list = this.handlers.get(event.name) ?? [];
    for (const handler of list) {
      await handler(event);
    }
  }
}
