import { prisma } from './src/database/client.js';
import { screenshotService } from './src/modules/screenshot/screenshot.service.js';

async function main() {
  console.log('Fetching a sketch...');
  const sketch = await prisma.sketchRequest.findFirst({
    orderBy: { createdAt: 'desc' },
  });

  if (!sketch) {
    console.error('No sketches found in database.');
    return;
  }

  console.log(`Found sketch: ${sketch.slug}`);
  console.log('Capturing screenshot...');

  try {
    const url = await screenshotService.capture(sketch.slug);
    console.log(`Success! Screenshot saved at: ${url}`);
  } catch (error) {
    console.error('Failed to capture screenshot:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
