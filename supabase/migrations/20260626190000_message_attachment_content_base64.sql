-- Store inbound attachment bytes for Bitrix floor-photo upload (n8n base64)
SET search_path TO postsale_agent_evapremium;

ALTER TABLE message_attachments
  ADD COLUMN IF NOT EXISTS content_base64 TEXT;
