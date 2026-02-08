export interface TurnstileVerifyError {
	statusCode: number;
	error: string;
}

export interface TurnstileVerifySuccess {
	ok: true;
}

export type TurnstileVerifyResult = TurnstileVerifySuccess | TurnstileVerifyError;

interface TurnstileVerifyParams {
	secretKey: string;
	token: string;
	verifyUrl: string;
	remoteIp?: string;
	timeoutMs?: number;
}

interface TurnstileSiteverifyResponse {
	success: boolean;
	'error-codes'?: string[];
}

const DEFAULT_TIMEOUT_MS = 5000;

function mapTurnstileError(errorCodes: string[] | undefined): TurnstileVerifyError {
	const codes = errorCodes ?? [];

	if (codes.includes('timeout-or-duplicate')) {
		return {
			statusCode: 400,
			error: 'Security verification expired. Please complete verification again.',
		};
	}

	if (codes.includes('missing-input-response') || codes.includes('invalid-input-response')) {
		return {
			statusCode: 400,
			error: 'Security verification is invalid. Please retry the verification step.',
		};
	}

	if (codes.includes('bad-request')) {
		return {
			statusCode: 400,
			error: 'Security verification request was invalid. Please refresh and try again.',
		};
	}

	return {
		statusCode: 403,
		error: 'Security verification failed. Please try again.',
	};
}

export async function verifyTurnstileToken({
	secretKey,
	token,
	verifyUrl,
	remoteIp,
	timeoutMs = DEFAULT_TIMEOUT_MS,
}: TurnstileVerifyParams): Promise<TurnstileVerifyResult> {
	if (!secretKey.trim()) {
		return {
			statusCode: 503,
			error: 'Security verification is not configured on the server.',
		};
	}

	if (!token.trim()) {
		return {
			statusCode: 400,
			error: 'Security verification token is required.',
		};
	}

	const body = new URLSearchParams({
		secret: secretKey,
		response: token,
	});
	if (remoteIp) {
		body.set('remoteip', remoteIp);
	}

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const response = await fetch(verifyUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body,
			signal: controller.signal,
		});

		if (!response.ok) {
			return {
				statusCode: 502,
				error: 'Security verification service is currently unavailable. Please retry shortly.',
			};
		}

		const result = (await response.json()) as TurnstileSiteverifyResponse;
		if (result.success) {
			return { ok: true };
		}

		return mapTurnstileError(result['error-codes']);
	} catch (error) {
		const isAbort = typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError';
		if (isAbort) {
			return {
				statusCode: 502,
				error: 'Security verification timed out. Please retry.',
			};
		}

		return {
			statusCode: 502,
			error: 'Security verification service is currently unavailable. Please retry shortly.',
		};
	} finally {
		clearTimeout(timeout);
	}
}
