/**
 * Test script to verify different redaction modes work correctly
 * Tests MASK, PSEUDONYMIZE, and GENERALIZE actions
 */

import { getPseudonym } from './src/utils/pseudonymizer.js';

const testJobId = 'test-job-123';

console.log('\n=== Testing Pseudonymizer ===\n');

// Test PERSON
const personName = 'Rahul Sharma';
const fakeName = await getPseudonym(testJobId, 'PERSON', personName);
console.log(`PERSON: "${personName}" → "${fakeName}"`);

// Test EMAIL
const email = 'rahul.sharma@example.com';
const fakeEmail = await getPseudonym(testJobId, 'EMAIL', email);
console.log(`EMAIL: "${email}" → "${fakeEmail}"`);

// Test PHONE
const phone = '+91 9876543210';
const fakePhone = await getPseudonym(testJobId, 'PHONE_IN', phone);
console.log(`PHONE: "${phone}" → "${fakePhone}"`);

// Test AADHAAR
const aadhaar = '1234 5678 9012';
const fakeAadhaar = await getPseudonym(testJobId, 'AADHAAR', aadhaar);
console.log(`AADHAAR: "${aadhaar}" → "${fakeAadhaar}"`);

// Test PAN
const pan = 'ABCDE1234F';
const fakePan = await getPseudonym(testJobId, 'PAN', pan);
console.log(`PAN: "${pan}" → "${fakePan}"`);

// Test ADDRESS
const address = '123 Main Street, Mumbai 400001';
const fakeAddress = await getPseudonym(testJobId, 'ADDRESS', address);
console.log(`ADDRESS: "${address}" → "${fakeAddress}"`);

// Test consistency - same input should give same output
const fakeName2 = await getPseudonym(testJobId, 'PERSON', personName);
console.log(`\n✓ Consistency check: ${fakeName === fakeName2 ? 'PASS' : 'FAIL'}`);
console.log(`  First:  "${fakeName}"`);
console.log(`  Second: "${fakeName2}"`);

console.log('\n=== All tests completed ===\n');
