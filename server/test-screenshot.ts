import { prisma } from './src/database/client.js';
import { screenshotService } from './src/modules/screenshot/screenshot.service.js';

async function main() {
  try {
    console.log('Fetching a sketch...');
    const sketch = await prisma.sketchRequest.findFirst({
      where: { status: 'APPROVED' },
      orderBy: { createdAt: 'desc' },
    });

    if (!sketch) {
      console.error('No approved sketches found in database.');
      return;
    }

    console.log(`Capturing screenshot for ${sketch.slug}...`);
    const url = await screenshotService.capture(sketch.slug);
    console.log(`Screenshot saved: ${url}`);
  } catch (error) {
    console.error('Failed to capture screenshot:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
