-- Bitrix floor photo upload side effect (UploadDealFloorPhotosUseCase)
SET search_path TO postsale_agent_evapremium;

ALTER TYPE side_effect_type ADD VALUE IF NOT EXISTS 'UPLOAD_BITRIX_DEAL_PHOTOS';
