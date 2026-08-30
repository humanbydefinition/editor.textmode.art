const FONT_SIZE = 16;
const SCREEN_COLS = 40;
const SCREEN_ROWS = 25;
const STREAM_LENGTH = 8192;
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
let maze = [];

function updateScreen() {
	const nextCols = Math.max(1, Math.min(SCREEN_COLS, t.grid.cols));
	const nextRows = Math.max(1, Math.min(SCREEN_ROWS, t.grid.rows));
	if (nextCols === cols && nextRows === rows) return;

	cols = nextCols;
	rows = nextRows;
	blankRow = ' '.repeat(cols);
	bootRows = BOOT_LINES.map((line) => line.padEnd(cols, ' ').slice(0, cols));
}

function mazeRow(row) {
	const start = (row - bootRows.length) * cols;
	return Array.from({ length: cols }, (_, col) => maze[(start + col) % maze.length]).join('');
}

function contentRow(row, cursor) {
	if (row < bootRows.length) return bootRows[row];

	const written = Math.max(0, Math.min(cols, cursor - row * cols));
	const text = mazeRow(row);
	return text.slice(0, written) + blankRow.slice(written);
}

t.fontSize(FONT_SIZE);

t.setup(() => {
	t.randomSeed('c64-ten-print-v1');
	maze = Array.from({ length: STREAM_LENGTH }, () => t.random(MAZE_GLYPHS) ?? MAZE_GLYPHS[0]);
});

t.draw(() => {
	if (!maze.length) return;
	updateScreen();

	const cursor = bootRows.length * cols + Math.floor(t.secs * CHARS_PER_SECOND);
	const cursorRow = Math.floor(cursor / cols);
	const scroll = Math.max(0, cursorRow - rows + 1);
	const left = -Math.floor(cols / 2);
	const top = -Math.floor(rows / 2);

	t.background(C64_BORDER);
	t.printAlign('left', 'top');
	t.cellColor(C64_SCREEN);
	t.charColor(C64_TEXT);
	for (let row = 0; row < rows; row++) t.print(contentRow(row + scroll, cursor), left, top + row, { markup: false });

	if (Math.floor(t.secs * 3.5) % 2 === 0) {
		t.charColor(C64_CURSOR);
		t.print(CURSOR_GLYPH, left + (cursor % cols), top + cursorRow - scroll, { markup: false });
	}
});
