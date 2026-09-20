/**
 * DOMAIN EVENTS (local, synchronous, in-memory).
 *
 * Rules:
 *  - NEVER cross module boundaries.
 *  - Each module owns its own instance, created inside its register() function.
 *  - Handled in-process; no serialization, no transport.
 */
import type { DomainEvent } from './interfaces/domain-event-interface.js';

type Handler<T> = (event: DomainEvent<T>) => void | Promise<void>;

export class DomainEventDispatcher {
  private readonly handlers = new Map<string, Set<Handler<unknown>>>();

  /** Returns an unsubscribe function so callers can clean up on teardown. */
  on<T>(eventName: string, handler: Handler<T>): () => void {
    let set = this.handlers.get(eventName);
    if (!set) {
      set = new Set();
      this.handlers.set(eventName, set);
    }
    const typed = handler as Handler<unknown>;
    set.add(typed);
    return () => set.delete(typed);
  }

  async dispatch(event: DomainEvent): Promise<void> {
    const set = this.handlers.get(event.name);
    if (!set) return;
    // allSettled: one failing handler must not prevent the others from running.
    await Promise.allSettled([...set].map((h) => Promise.resolve(h(event))));
  }

  clear(): void {
    this.handlers.clear();
  }
}
