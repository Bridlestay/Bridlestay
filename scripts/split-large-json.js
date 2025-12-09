const fs = require('fs');
const path = require('path');

const PROCESSED_DIR = path.join(__dirname, '../public/kml/processed');
const MAX_SIZE_BYTES = 80 * 1024 * 1024; // 80MB to be safely under GitHub's 100MB limit

async function splitLargeFiles() {
  const files = fs.readdirSync(PROCESSED_DIR).filter(f => f.endsWith('.json') && !f.includes('_'));
  
  for (const file of files) {
    const filePath = path.join(PROCESSED_DIR, file);
    const stats = fs.statSync(filePath);
    const sizeMB = stats.size / (1024 * 1024);
    
    console.log(`\n${file}: ${sizeMB.toFixed(2)} MB`);
    
    if (stats.size > MAX_SIZE_BYTES) {
      console.log(`  Splitting ${file} (exceeds 80MB limit)...`);
      await splitFile(filePath, file);
    } else {
      console.log(`  OK - no splitting needed`);
    }
  }
  
  console.log('\nDone! Updating summary...');
  updateSummary();
}

async function splitFile(filePath, fileName) {
  const baseName = fileName.replace('.json', '');
  const content = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(content);
  
  // Handle both array format and {type, count, features} format
  let features;
  let isWrapped = false;
  
  if (Array.isArray(data)) {
    features = data;
  } else if (data.features && Array.isArray(data.features)) {
    features = data.features;
    isWrapped = true;
  } else {
    console.log(`  Skipping ${fileName} - unknown format`);
    return;
  }
  
  const totalItems = features.length;
  const itemSize = content.length / totalItems;
  const itemsPerChunk = Math.floor(MAX_SIZE_BYTES / itemSize);
  const numChunks = Math.ceil(totalItems / itemsPerChunk);
  
  console.log(`  Total items: ${totalItems}`);
  console.log(`  Splitting into ${numChunks} chunks (~${itemsPerChunk} items each)`);
  
  for (let i = 0; i < numChunks; i++) {
    const start = i * itemsPerChunk;
    const end = Math.min((i + 1) * itemsPerChunk, totalItems);
    const chunkFeatures = features.slice(start, end);
    
    const chunkFileName = `${baseName}_${i + 1}.json`;
    const chunkPath = path.join(PROCESSED_DIR, chunkFileName);
    
    // Keep the same wrapper format
    const chunkData = isWrapped 
      ? { type: data.type, count: chunkFeatures.length, features: chunkFeatures }
      : chunkFeatures;
    
    fs.writeFileSync(chunkPath, JSON.stringify(chunkData));
    
    const chunkStats = fs.statSync(chunkPath);
    const chunkSizeMB = chunkStats.size / (1024 * 1024);
    console.log(`  Created ${chunkFileName}: ${chunkFeatures.length} items, ${chunkSizeMB.toFixed(2)} MB`);
  }
  
  // Remove the original large file
  fs.unlinkSync(filePath);
  console.log(`  Removed original ${fileName}`);
}

function updateSummary() {
  const summaryPath = path.join(PROCESSED_DIR, 'summary.json');
  const files = fs.readdirSync(PROCESSED_DIR).filter(f => f.endsWith('.json') && f !== 'summary.json');
  
  const fileInfo = {};
  
  for (const file of files) {
    const filePath = path.join(PROCESSED_DIR, file);
    const stats = fs.statSync(filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    
    // Get count - handle both array and wrapped format
    let itemCount;
    if (Array.isArray(data)) {
      itemCount = data.length;
    } else if (data.features && Array.isArray(data.features)) {
      itemCount = data.features.length;
    } else if (typeof data.count === 'number') {
      itemCount = data.count;
    } else {
      itemCount = 0;
    }
    
    // Extract base type (e.g., "footpath" from "footpath_1.json")
    const match = file.match(/^([a-z]+)(?:_\d+)?\.json$/);
    if (match) {
      const baseType = match[1];
      if (!fileInfo[baseType]) {
        fileInfo[baseType] = { files: [], totalCount: 0, totalSizeMB: 0 };
      }
      fileInfo[baseType].files.push(file);
      fileInfo[baseType].totalCount += itemCount;
      fileInfo[baseType].totalSizeMB += stats.size / (1024 * 1024);
    }
  }
  
  const summary = {
    lastUpdated: new Date().toISOString(),
    types: fileInfo,
    allFiles: files
  };
  
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  
  console.log('\nSummary:');
  for (const [type, info] of Object.entries(fileInfo)) {
    console.log(`  ${type}: ${info.totalCount} paths across ${info.files.length} file(s), ${info.totalSizeMB.toFixed(2)} MB total`);
  }
}

splitLargeFiles().catch(console.error);

