import { prisma } from '../src/database/client.js';
import { screenshotService } from '../src/modules/screenshot/screenshot.service.js';

async function regenerate() {
  console.log('Finding all approved sketches...');

  try {
    const sketches = await prisma.sketchRequest.findMany({
      where: {
        status: 'APPROVED',
      },
    });

    if (sketches.length === 0) {
      console.log('No approved sketches found.');
      return;
    }

    console.log(`Found ${sketches.length} approved sketches to regenerate.`);

    let successCount = 0;
    let errorCount = 0;

    for (const sketch of sketches) {
      console.log(`Processing ${sketch.slug} (${successCount + errorCount + 1}/${sketches.length})`);

      try {
        const url = await screenshotService.capture(sketch.slug);

        await prisma.sketchRequest.update({
          where: { id: sketch.id },
          data: { ogImageUrl: url },
        });

        console.log(`✓ Regenerated ${sketch.slug}: ${url}`);
        successCount++;
      } catch (error) {
        console.error(`✗ Failed to capture ${sketch.slug}:`, error);
        errorCount++;
      }
    }

    console.log('\n========================================');
    console.log('Regeneration complete.');
    console.log(`Successfully processed: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log('========================================');
  } finally {
    await prisma.$disconnect();
  }
}

regenerate();
