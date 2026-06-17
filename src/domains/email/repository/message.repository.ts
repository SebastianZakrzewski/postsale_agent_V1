import {
  CustomerMessageRow,
  OutgoingMessageRow,
} from '../../../lib/persistence';

export abstract class CustomerMessageRepository {
  abstract create(
    row: Omit<CustomerMessageRow, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<CustomerMessageRow>;
  abstract findByWorkflowId(workflowId: string): Promise<CustomerMessageRow[]>;
}

export abstract class OutgoingMessageRepository {
  abstract create(
    row: Omit<OutgoingMessageRow, 'id' | 'created_at'>,
  ): Promise<OutgoingMessageRow>;
}

export const CUSTOMER_MESSAGE_REPOSITORY = Symbol(
  'CUSTOMER_MESSAGE_REPOSITORY',
);
export const OUTGOING_MESSAGE_REPOSITORY = Symbol(
  'OUTGOING_MESSAGE_REPOSITORY',
);
