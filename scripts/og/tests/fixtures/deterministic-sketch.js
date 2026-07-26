/* global t */

let drawCount = 0;
t.fontSize(16);
t.draw(() => {
	drawCount += 1;
	t.background(drawCount % 256, 10, 14);
	t.charColor(242, 242, 236);
	t.cellColor(drawCount % 256, 10, 14);
	t.print('DRAW ' + drawCount, -4, 0);
});
