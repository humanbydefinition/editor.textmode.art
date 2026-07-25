import { readFile } from 'node:fs/promises';
import { OG_HEIGHT, OG_WIDTH } from './config';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export async function assertOgPng(filePath: string): Promise<{ width: number; height: number }> {
	let buffer: Buffer;
	try {
		buffer = await readFile(filePath);
	} catch (error) {
		throw new Error(`Missing OG image: ${filePath}`, { cause: error });
	}

	if (
		buffer.length < 24 ||
		!buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE) ||
		buffer.toString('ascii', 12, 16) !== 'IHDR'
	) {
		throw new Error(`OG image is not a valid PNG: ${filePath}`);
	}

	const width = buffer.readUInt32BE(16);
	const height = buffer.readUInt32BE(20);
	if (width !== OG_WIDTH || height !== OG_HEIGHT) {
		throw new Error(`OG image must be ${OG_WIDTH}x${OG_HEIGHT}, got ${width}x${height}: ${filePath}`);
	}

	return { width, height };
}
