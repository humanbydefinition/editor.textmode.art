export interface SharePayloadV1 {
	v: 1;
	createdAt: number;
	engines: {
		textmode?: string;
	};
}

export type SharePayload = SharePayloadV1;
