-- completion confirmation email side effect (SendCompletionConfirmationEmailUseCase)
SET search_path TO postsale_agent_evapremium;

ALTER TYPE side_effect_type ADD VALUE IF NOT EXISTS 'SEND_COMPLETION_CONFIRMATION_EMAIL';
