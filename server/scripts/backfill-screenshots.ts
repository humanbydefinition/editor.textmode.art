import { prisma } from '../src/database/client.js';
import { screenshotService } from '../src/modules/screenshot/screenshot.service.js';

async function backfill() {
  console.log('🔍 Finding approved sketches without OG images...');

  const sketches = await prisma.sketchRequest.findMany({
    where: {
      status: 'APPROVED',
      ogImageUrl: null,
    },
  });

  if (sketches.length === 0) {
    console.log('✅ No sketches need backfilling.');
    return;
  }

  console.log(`📸 Found ${sketches.length} sketches to process.`);

  let successCount = 0;
  let errorCount = 0;

  for (const sketch of sketches) {
    console.log(`\nProcessing ${sketch.slug} (${successCount + errorCount + 1}/${sketches.length})...`);
    
    try {
      const url = await screenshotService.capture(sketch.slug);
      
      await prisma.sketchRequest.update({
        where: { id: sketch.id },
        data: { ogImageUrl: url },
      });
      
      console.log(`✅ Success! Saved to ${url}`);
      successCount++;
    } catch (error) {
      console.error(`❌ Failed to capture ${sketch.slug}:`, error);
      errorCount++;
    }
  }

  console.log('\n--- Backfill Complete ---');
  console.log(`✅ Successfully processed: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  
  await prisma.$disconnect();
}

backfill();
