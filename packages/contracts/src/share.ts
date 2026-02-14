export interface SharePayloadV1 {
  v: 1;
  createdAt: number;
  engines: {
    textmode?: string;
    strudel?: string;
  };
}

export type SharePayload = SharePayloadV1;
