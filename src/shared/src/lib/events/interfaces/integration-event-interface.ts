export interface IntegrationEvent<TPayload = unknown> {
  readonly name: string;
  readonly payload: TPayload;
  readonly occurredAt: string;
  /** Optional; propagated across module boundaries for tracing. */
  readonly correlationId?: string;
}
