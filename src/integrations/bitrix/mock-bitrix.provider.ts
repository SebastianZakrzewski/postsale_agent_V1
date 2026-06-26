import { BitrixDealPayload } from './bitrix.types';
import { BitrixReadError } from './bitrix-read.error';
import { BitrixProvider } from './bitrix.provider';
import { BitrixDealFileUpload } from '../../domains/bitrix/services/bitrix-deal-file-field.builder';

export class MockBitrixProvider extends BitrixProvider {
  private readonly deals = new Map<string, BitrixDealPayload>();
  private readonly contactEmails = new Map<string, string>();
  private readFailureMessage: string | null = null;

  setDeal(dealId: string, payload: BitrixDealPayload): void {
    this.deals.set(dealId, payload);
  }

  setContactEmail(contactId: string, email: string): void {
    this.contactEmails.set(contactId, email);
  }

  setReadFailure(message: string): void {
    this.readFailureMessage = message;
  }

  clearReadFailure(): void {
    this.readFailureMessage = null;
  }

  async readDeal(dealId: string): Promise<BitrixDealPayload> {
    if (this.readFailureMessage) {
      throw new BitrixReadError(dealId, this.readFailureMessage, false);
    }

    const payload = this.deals.get(dealId);
    if (!payload) {
      throw new BitrixReadError(
        dealId,
        'Deal not found in mock provider',
        false,
      );
    }
    return payload;
  }

  async readContactPrimaryEmail(contactId: string): Promise<string | null> {
    if (this.readFailureMessage) {
      throw new BitrixReadError(contactId, this.readFailureMessage, false);
    }

    return this.contactEmails.get(contactId) ?? null;
  }

  private stageUpdateFailureMessage: string | null = null;
  private readonly stageUpdates: Array<{ dealId: string; stageId: string }> =
    [];
  private readonly comments: Array<{ dealId: string; comment: string }> = [];
  private readonly floorPhotoUploads: Array<{
    dealId: string;
    fieldName: string;
    uploads: BitrixDealFileUpload[];
  }> = [];

  setStageUpdateFailure(message: string): void {
    this.stageUpdateFailureMessage = message;
  }

  clearStageUpdateFailure(): void {
    this.stageUpdateFailureMessage = null;
  }

  getStageUpdates(): Array<{ dealId: string; stageId: string }> {
    return [...this.stageUpdates];
  }

  getComments(): Array<{ dealId: string; comment: string }> {
    return [...this.comments];
  }

  getFloorPhotoUploads(): Array<{
    dealId: string;
    fieldName: string;
    uploads: BitrixDealFileUpload[];
  }> {
    return [...this.floorPhotoUploads];
  }

  async updateDealStage(dealId: string, stageId: string): Promise<void> {
    if (this.stageUpdateFailureMessage) {
      throw new BitrixReadError(dealId, this.stageUpdateFailureMessage, true);
    }

    this.stageUpdates.push({ dealId, stageId });
  }

  async addDealComment(dealId: string, comment: string): Promise<void> {
    this.comments.push({ dealId, comment });
  }

  async uploadDealFloorPhotos(
    dealId: string,
    fieldName: string,
    uploads: BitrixDealFileUpload[],
  ): Promise<void> {
    this.floorPhotoUploads.push({ dealId, fieldName, uploads });
  }
}
