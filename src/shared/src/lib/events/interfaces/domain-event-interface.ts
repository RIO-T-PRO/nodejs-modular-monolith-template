export interface DomainEvent<TPayload = unknown> {
  readonly name: string;
  readonly payload: TPayload;
  readonly occurredAt: Date;
}
