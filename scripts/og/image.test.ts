import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { assertOgPng } from './image';

const temporaryDirectories: string[] = [];

afterEach(async () => {
	await Promise.all(
		temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))
	);
});

describe('OG image invariant', () => {
	it('accepts only 1200x630 PNG files', async () => {
		const directory = await createTemporaryDirectory();
		const validPath = path.join(directory, 'valid.png');
		const wrongSizePath = path.join(directory, 'wrong.png');
		const corruptPath = path.join(directory, 'corrupt.png');
		await writePngHeader(validPath, 1200, 630);
		await writePngHeader(wrongSizePath, 600, 315);
		await writeFile(corruptPath, Buffer.from('not a png'));

		await expect(assertOgPng(validPath)).resolves.toEqual({ width: 1200, height: 630 });
		await expect(assertOgPng(wrongSizePath)).rejects.toThrow('must be 1200x630');
		await expect(assertOgPng(corruptPath)).rejects.toThrow('not a valid PNG');
		await expect(assertOgPng(path.join(directory, 'missing.png'))).rejects.toThrow('Missing OG image');
	});
});

async function createTemporaryDirectory(): Promise<string> {
	const directory = await mkdtemp(path.join(os.tmpdir(), 'og-image-test-'));
	temporaryDirectories.push(directory);
	return directory;
}

async function writePngHeader(filePath: string, width: number, height: number): Promise<void> {
	const buffer = Buffer.alloc(24);
	Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer, 0);
	buffer.write('IHDR', 12, 'ascii');
	buffer.writeUInt32BE(width, 16);
	buffer.writeUInt32BE(height, 20);
	await writeFile(filePath, buffer);
}
