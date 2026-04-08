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
    <script>
        document.body.dataset.status = 'running';
    </script>

    <script id="sketch-code" type="text/plain">
/* SKETCH_CODE_INJECTION */
    </script>

    <script type="module">
        const SCREENSHOT_WIDTH = 1536;
        const SCREENSHOT_HEIGHT = 816;
        const CAPTURE_AT_FRAME = /* CAPTURE_FRAME_INJECTION */;
        const toErrorMessage = (error) => error instanceof Error ? error.message : String(error);
        const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
        const markReady = async () => {
            // Allow one render pass after setup-driven mutations (e.g. t.fontSize)
            await nextFrame();
            await nextFrame();
            document.body.dataset.status = 'ready';
        };
        const markError = (error) => {
            const message = toErrorMessage(error);
            console.error('Sketch execution error:', error);
            document.body.dataset.status = 'error';
            document.body.dataset.error = message;
        };

        const runSketch = async ({ textmode, synth, filters }) => {
            const { src, osc, noise, gradient, solid, shape, voronoi, charColor, cellColor, paint, char, SynthPlugin } = synth;
            const { createFiltersPlugin } = filters;
            const t = textmode.create({
                width: SCREENSHOT_WIDTH,
                height: SCREENSHOT_HEIGHT,
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

            const code = document.getElementById('sketch-code').textContent ?? '';
            const keys = Object.keys(globals);
            const values = Object.values(globals);

            let setupCompleted = false;
            t.setup(async () => {
                try {
                    const fn = new Function(...keys, '"use strict";\\n' + code);
                    fn(...values);

                    // Watermark injection (secure naming to avoid clashes)
                    const __screenshot_watermark_text = 'synth.textmode.art';
                    const __screenshot_watermark_fontSize = 48;
                    const __screenshot_watermark_blendMode = 'normal';

                    const __screenshot_watermark_layer = t.layers.add({
                        fontSize: __screenshot_watermark_fontSize,
                        blendMode: __screenshot_watermark_blendMode
                    });

                    const __screenshot_watermark_drawText = (s, x, y) => {
                        t.charColor(255, 255, 255, 255);
                        t.cellColor(0, 0, 0, 255);
                        for (let i = 0; i < s.length; i++) {
                            t.translate(x + i, y);
                            t.char(s[i]);
                            t.rect(1, 1);
                            t.translate(-(x + i), -y);
                        }
                    };

                    __screenshot_watermark_layer.draw(() => {
                        t.clear();

                        // Bottom-left placement in grid coords
                        const gx = (__screenshot_watermark_layer.grid.cols / 2) - __screenshot_watermark_text.length + 1;
                        const gy = (__screenshot_watermark_layer.grid.rows / 2) - 1;

                        __screenshot_watermark_drawText(__screenshot_watermark_text, gx, gy);
                    });

                    // Jump to the target frame so time-dependent sketch code sees the correct value.
                    if (CAPTURE_AT_FRAME > 1) {
                        t.frameCount = CAPTURE_AT_FRAME - 1;
                    }

                    setupCompleted = true;
                } catch (error) {
                    markError(error);
                }
            });

            await new Promise((resolve, reject) => {
                const waitForSketchFrames = () => {
                    const status = document.body.dataset.status;
                    if (status === 'error') {
                        reject(new Error(document.body.dataset.error ?? 'Sketch setup failed'));
                        return;
                    }

                    // frameCount advances only once loading is finished and user frames are rendering.
                    if (setupCompleted && t.frameCount >= CAPTURE_AT_FRAME) {
                        resolve(undefined);
                        return;
                    }

                    requestAnimationFrame(waitForSketchFrames);
                };

                requestAnimationFrame(waitForSketchFrames);
            });

            await markReady();
        };

        const bootstrap = async () => {
            const textmodeModule = await import('https://esm.sh/textmode.js@0.11.0-beta.3');
            const synthModule = await import('https://esm.sh/textmode.synth.js@1.5.1');
            const filtersModule = await import('https://esm.sh/textmode.filters.js@1.1.1');

            await runSketch({
                textmode: textmodeModule.textmode,
                synth: synthModule,
                filters: filtersModule
            });
        };

        bootstrap().catch(markError);
    </script>
</body>
</html>`;
