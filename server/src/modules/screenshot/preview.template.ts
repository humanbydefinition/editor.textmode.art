export const PREVIEW_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sketch Preview</title>
    <style>
        body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #000; }
        canvas { display: block; }
    </style>
</head>
<body>
    <script id="sketch-code" type="text/plain">
/* SKETCH_CODE_INJECTION */
    </script>

    <script type="module">
        import { textmode } from 'https://esm.sh/textmode.js@0.10.0';
        import { 
            src, osc, noise, gradient, solid, shape, voronoi, 
            charColor, cellColor, paint, char, SynthPlugin 
        } from 'https://esm.sh/textmode.synth.js@1.5.1';
        import { createFiltersPlugin } from 'https://esm.sh/textmode.filters.js@1.1.1';

        const t = textmode.create({
            width: window.innerWidth,
            height: window.innerHeight,
            plugins: [SynthPlugin, createFiltersPlugin()]
        });
        document.body.appendChild(t.canvas);

        const audio = {
            fft: () => [],
            waveform: () => [],
            bass: () => 0,
            mid: () => 0,
            high: () => 0,
            volume: () => 0
        };

        const globals = {
            t,
            audio,
            src, osc, noise, gradient, solid, shape, voronoi, 
            charColor, cellColor, paint, char, SynthPlugin
        };

        try {
            const code = document.getElementById('sketch-code').textContent;
            const keys = Object.keys(globals);
            const values = Object.values(globals);
            const fn = new Function(...keys, '"use strict";\\n' + code);
            fn(...values);
        } catch (e) {
            console.error("Sketch execution error:", e);
            document.body.dataset.error = e instanceof Error ? e.message : String(e);
        }

        function checkReady() {
            if (t.frameCount > 0 || document.body.dataset.error) {
                document.body.dataset.ready = "true";
            } else {
                requestAnimationFrame(checkReady);
            }
        }
        requestAnimationFrame(checkReady);

        window.addEventListener('resize', () => {
            t.resizeCanvas(window.innerWidth, window.innerHeight);
        });
    </script>
</body>
</html>`;
