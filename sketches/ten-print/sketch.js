const FONT_SIZE = 16;
const SCREEN_COLS = 40;
const SCREEN_ROWS = 25;
const CHARS_PER_SECOND = 42;

const C64_BORDER = '#867ade';
const C64_SCREEN = '#352879';
const C64_TEXT = '#867ade';
const C64_CURSOR = '#ffffff';
const CURSOR_GLYPH = '▼';
const MAZE_GLYPHS = ['╞', '┼'];

const BOOT_LINES = [
	'',
	'    **** COMMODORE 64 BASIC V2 ****',
	'',
	' 64K RAM SYSTEM  38911 BASIC BYTES FREE',
	'',
	'READY.',
	'10 PRINT CHR$(205.5+RND(1)); : GOTO 10',
	'RUN',
];

let screen = {};
const mazeRows = new Map();

function mazeGlyph(index) {
	let value = index + 0x9e3779b9;
	value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
	value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
	return MAZE_GLYPHS[value >>> 31];
}

function getScreen() {
	const cols = Math.max(1, Math.min(SCREEN_COLS, t.grid.cols));
	const rows = Math.max(1, Math.min(SCREEN_ROWS, t.grid.rows));
	if (screen.cols === cols && screen.rows === rows) return screen;

	mazeRows.clear();
	screen = {
		cols,
		rows,
		originX: -Math.floor(cols / 2),
		originY: -Math.floor(rows / 2),
		emptyRow: ' '.repeat(cols),
		bootRows: BOOT_LINES.map((line) => line.padEnd(cols, ' ').slice(0, cols)),
	};
	return screen;
}

function getMazeRow(virtualRow, layout) {
	const cached = mazeRows.get(virtualRow);
	if (cached) return cached;

	const start = virtualRow * layout.cols - layout.bootRows.length * layout.cols;
	let row = '';
	for (let col = 0; col < layout.cols; col++) row += mazeGlyph(start + col);
	mazeRows.set(virtualRow, row);
	return row;
}

function getRow(virtualRow, cursorIndex, layout) {
	if (virtualRow < layout.bootRows.length) return layout.bootRows[virtualRow];

	const row = getMazeRow(virtualRow, layout);
	const written = Math.max(0, Math.min(layout.cols, cursorIndex - virtualRow * layout.cols));
	return written === layout.cols ? row : row.slice(0, written) + layout.emptyRow.slice(written);
}

function pruneMazeRows(firstRow, lastRow) {
	for (const row of mazeRows.keys()) {
		if (row < firstRow || row > lastRow) mazeRows.delete(row);
	}
}

t.fontSize(FONT_SIZE);

t.draw(() => {
	const layout = getScreen();
	const cursorIndex = layout.bootRows.length * layout.cols + Math.floor(t.secs * CHARS_PER_SECOND);
	const cursorRow = Math.floor(cursorIndex / layout.cols);
	const scrollOffset = Math.max(0, cursorRow - layout.rows + 1);

	t.background(C64_BORDER);
	t.printAlign('left', 'top');
	t.cellColor(C64_SCREEN);
	t.charColor(C64_TEXT);

	for (let row = 0; row < layout.rows; row++) {
		const virtualRow = row + scrollOffset;
		t.print(getRow(virtualRow, cursorIndex, layout), layout.originX, layout.originY + row, { markup: false });
	}

	pruneMazeRows(scrollOffset, scrollOffset + layout.rows);

	if (Math.floor(t.secs * 3.5) % 2 === 0) {
		t.cellColor(C64_SCREEN);
		t.charColor(C64_CURSOR);
		t.print(
			CURSOR_GLYPH,
			layout.originX + (cursorIndex % layout.cols),
			layout.originY + cursorRow - scrollOffset,
			{ markup: false }
		);
	}
});
