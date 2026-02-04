export const defaultTextmodeSketch = `// Live coding with textmode.js
// Ctrl+Enter = run · Ctrl+Shift+R = hard reset
// Docs: https://code.textmode.art/

t.fontSize(16);

t.layers.base.synth( // define a synth for the textmode.js base layer
  char(osc(2, -0.1, 0.5).kaleid(50))
    .charMap("@#%*+=-:. ")
    .charColor(osc(25, -0.1, 0.5).kaleid(50))
    .cellColor(osc(25, -0.1, 0.5).kaleid(50).colorama(0.1))
);

// custom layer for the label, rendered on top of the base layer
const labelLayer = t.layers.add({ fontSize: 64, blendMode: "difference" }); 
const label = "synth.textmode.art";


const drawText = (s, x, y) => { 
  t.charColor("#fff");
  t.cellColor(0, 0, 0, 0);
  for (let i = 0; i < s.length; i++) {
    t.translate(x + i, y);
    t.char(s[i]);
    t.rect(1, 1);
    t.translate(-(x + i), -y);
  }
};

t.draw(() => { // base layer draw loop (could also be used for drawing on top of the synth)
  const a = t.frameCount * 0.05, n = t.frameCount;
  t.filter("hueRotate", n); // apply global image filters to the final result in sequence
  t.filter("chromaticAberration", { amount: 8, direction: [Math.sin(a), Math.cos(a)] });
  t.filter("glitch", (n * 0.01) % 0.2);
});

labelLayer.draw(() => {
  t.clear(); 
  drawText(label, -label.length / 2, 0); // draw the label

  const time = t.frameCount / 60;
  const R = Math.min(innerWidth, innerHeight) * 0.05;

  const x = R * (0.70 * Math.sin(time * 0.93) + 0.22 * Math.sin(time * 2.41 + 1.2) + 0.08 * Math.sin(time * 6.90 + 0.4));
  const y = R * (0.70 * Math.cos(time * 1.07) + 0.20 * Math.cos(time * 2.83 + 0.7) + 0.10 * Math.cos(time * 7.30 + 2.1));
  labelLayer.offset(x, y); // offset the layer in pixel space when compositing all textmode layers
});

// Return a cleanup function (optional):
// return () => { console.log('cleanup!'); };`;
