-- Task-06: prevent duplicate inbound customer messages on provider retry/race.
CREATE UNIQUE INDEX idx_customer_messages_external_message_id_unique
  ON customer_messages (external_message_id)
  WHERE external_message_id IS NOT NULL;
