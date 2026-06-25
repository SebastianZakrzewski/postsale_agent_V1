import {
  CustomerMessageRow,
  OutgoingMessageRow,
  MessageAttachmentRow,
  MessageLinkRow,
} from '../../../lib/persistence';

export abstract class CustomerMessageRepository {
  abstract create(
    row: Omit<CustomerMessageRow, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<CustomerMessageRow>;
  abstract findByWorkflowId(workflowId: string): Promise<CustomerMessageRow[]>;
  abstract findByExternalMessageId(
    externalMessageId: string,
  ): Promise<CustomerMessageRow | null>;
}

export abstract class MessageAttachmentRepository {
  abstract createMany(
    rows: Array<Omit<MessageAttachmentRow, 'id' | 'created_at'>>,
  ): Promise<MessageAttachmentRow[]>;
  abstract findByMessageId(messageId: string): Promise<MessageAttachmentRow[]>;
}

export abstract class MessageLinkRepository {
  abstract createMany(
    rows: Array<Omit<MessageLinkRow, 'id' | 'created_at'>>,
  ): Promise<MessageLinkRow[]>;
  abstract findByMessageId(messageId: string): Promise<MessageLinkRow[]>;
}

export abstract class OutgoingMessageRepository {
  abstract create(
    row: Omit<OutgoingMessageRow, 'id' | 'created_at'>,
  ): Promise<OutgoingMessageRow>;
  abstract findByProviderMessageId(
    providerMessageId: string,
  ): Promise<OutgoingMessageRow | null>;
}

export const CUSTOMER_MESSAGE_REPOSITORY = Symbol(
  'CUSTOMER_MESSAGE_REPOSITORY',
);
export const MESSAGE_ATTACHMENT_REPOSITORY = Symbol(
  'MESSAGE_ATTACHMENT_REPOSITORY',
);
export const MESSAGE_LINK_REPOSITORY = Symbol('MESSAGE_LINK_REPOSITORY');
export const OUTGOING_MESSAGE_REPOSITORY = Symbol(
  'OUTGOING_MESSAGE_REPOSITORY',
);
