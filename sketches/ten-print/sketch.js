const FONT_SIZE = 16;
const MAX_COLS = 40;
const MAX_ROWS = 25;
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

let cols = 0;
let rows = 0;
let blankRow = '';
let bootRows = [];

function mazeGlyph(index) {
	let value = index + 0x9e3779b9;
	value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
	value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
	return MAZE_GLYPHS[value >>> 31];
}

function updateScreen() {
	const nextCols = Math.max(1, Math.min(MAX_COLS, t.grid.cols));
	const nextRows = Math.max(1, Math.min(MAX_ROWS, t.grid.rows));
	if (nextCols === cols && nextRows === rows) return;

	cols = nextCols;
	rows = nextRows;
	blankRow = ' '.repeat(cols);
	bootRows = BOOT_LINES.map((line) => line.padEnd(cols, ' ').slice(0, cols));
}

function mazeRow(row) {
	const start = (row - bootRows.length) * cols;
	let text = '';
	for (let col = 0; col < cols; col++) text += mazeGlyph(start + col);
	return text;
}

function contentRow(row, cursor) {
	if (row < bootRows.length) return bootRows[row];
	const written = Math.max(0, Math.min(cols, cursor - row * cols));
	const text = mazeRow(row);
	return text.slice(0, written) + blankRow.slice(written);
}

t.fontSize(FONT_SIZE);

t.draw(() => {
	updateScreen();

	const cursor = bootRows.length * cols + Math.floor(t.secs * CHARS_PER_SECOND);
	const cursorRow = Math.floor(cursor / cols);
	const scroll = Math.max(0, cursorRow - rows + 1);

	t.background(C64_BORDER);
	t.printAlign('left', 'top');
	t.cellColor(C64_SCREEN);
	t.charColor(C64_TEXT);
	for (let row = 0; row < rows; row++) {
		t.print(contentRow(row + scroll, cursor), -Math.floor(cols / 2), -Math.floor(rows / 2) + row, { markup: false });
	}

	if (Math.floor(t.secs * 3.5) % 2 === 0) {
		t.charColor(C64_CURSOR);
		t.print(CURSOR_GLYPH, -Math.floor(cols / 2) + (cursor % cols), -Math.floor(rows / 2) + cursorRow - scroll, {
			markup: false,
		});
	}
});
