#!/usr/bin/env node
/**
 * Test script for Phase 3 compression implementation
 * Run with: node scripts/testCompression.js
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Simple compression test using Node.js Buffer and gzip
import { gzipSync } from 'zlib';

// Load test data
const testDataPath = join(__dirname, '../src/lib/testData/matchScoutingData.json');
const testData = JSON.parse(readFileSync(testDataPath, 'utf8'));

console.log('🧪 Testing Phase 3 Advanced Compression');
console.log('========================================');

// Original JSON approach
const originalJson = JSON.stringify({ entries: testData });
const originalSize = Buffer.from(originalJson).length;

console.log(`📊 Original JSON size: ${originalSize} bytes`);

// Simple gzip test (basic compression)
const gzipCompressed = gzipSync(originalJson);
const gzipSize = gzipCompressed.length;
const gzipReduction = ((1 - gzipSize / originalSize) * 100).toFixed(1);

console.log(`🗜️ Gzip compressed: ${gzipSize} bytes (${gzipReduction}% reduction)`);

// Manual binary encoding simulation (approximate)
let binarySize = 0;

// Count entries and calculate approximate binary size
const sampleEntry = testData[0];
const entryCount = testData.length;

// Estimate binary size per entry based on our compression schema
let estimatedBinaryEntrySize = 0;

// String fields (with length prefixes)
estimatedBinaryEntrySize += 2 + (sampleEntry.matchNumber?.length || 0); // matchNumber
estimatedBinaryEntrySize += 2 + (sampleEntry.selectTeam?.length || 0);   // team number
estimatedBinaryEntrySize += 2 + (sampleEntry.comment?.length || 0);      // comment

// Fixed size fields
estimatedBinaryEntrySize += 1; // alliance (dictionary compressed)
estimatedBinaryEntrySize += 1; // scouter initials (dictionary compressed)
estimatedBinaryEntrySize += 1; // start poses (6 booleans packed into 1 byte)
estimatedBinaryEntrySize += 20; // numeric counts (20 uint8 fields)
estimatedBinaryEntrySize += 1; // endgame booleans (6 booleans packed into 1 byte)
estimatedBinaryEntrySize += 1; // event name (dictionary compressed or length prefix)

// Account for average string lengths in test data
const avgMatchNumberLength = testData.reduce((sum, e) => sum + (e.matchNumber?.length || 0), 0) / entryCount;
const avgTeamLength = testData.reduce((sum, e) => sum + (e.selectTeam?.length || 0), 0) / entryCount;
const avgCommentLength = testData.reduce((sum, e) => sum + (e.comment?.length || 0), 0) / entryCount;

const averageBinaryEntrySize = 1 + 1 + 1 + 20 + 1 + 1 + // fixed fields
                               (2 + avgMatchNumberLength) + 
                               (2 + avgTeamLength) + 
                               (2 + avgCommentLength);

const estimatedBinarySize = Math.ceil(averageBinaryEntrySize * entryCount);
console.log(`🔢 Estimated binary encoding: ${estimatedBinarySize} bytes (${((1 - estimatedBinarySize / originalSize) * 100).toFixed(1)}% reduction)`);

// Estimate binary + gzip
const binaryGzipEstimate = Math.ceil(estimatedBinarySize * 0.7); // Assume ~30% additional compression from gzip
console.log(`🚀 Estimated binary + gzip: ${binaryGzipEstimate} bytes (${((1 - binaryGzipEstimate / originalSize) * 100).toFixed(1)}% total reduction)`);

// QR code estimates (assuming ~2KB per QR code)
const bytesPerQR = 2000;
const originalQRs = Math.ceil(originalSize / bytesPerQR);
const gzipQRs = Math.ceil(gzipSize / bytesPerQR);
const binaryGzipQRs = Math.ceil(binaryGzipEstimate / bytesPerQR);

console.log('');
console.log('📱 QR Code Count Estimates:');
console.log(`   Original JSON: ~${originalQRs} QR codes`);
console.log(`   Gzip only: ~${gzipQRs} QR codes`);
console.log(`   Binary + Gzip: ~${binaryGzipQRs} QR codes`);
console.log(`   Reduction: ${originalQRs} → ${binaryGzipQRs} codes (${Math.round((1 - binaryGzipQRs / originalQRs) * 100)}% fewer QR codes)`);

console.log('');
console.log('✅ Phase 3 compression should significantly reduce QR code count!');
console.log(`📈 Expected improvement: ${originalQRs - binaryGzipQRs} fewer QR codes to scan`);
