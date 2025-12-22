/**
 * Test Invoice Number Format Functions
 * Run this in browser console or Node.js to verify functionality
 */

// Copy these functions from src/lib/invoice-helpers.ts

function incrementInvoiceNumber(current) {
  if (!current || typeof current !== 'string') {
    console.warn('Invalid invoice number provided:', current);
    return current;
  }

  const parts = current.split('-');
  
  if (parts.length < 2) {
    const asNumber = parseInt(current, 10);
    if (!isNaN(asNumber)) {
      return (asNumber + 1).toString().padStart(current.length, '0');
    }
    console.warn('Cannot auto-increment invoice number:', current);
    return current;
  }

  try {
    const lastPart = parts[parts.length - 1];
    const correlative = parseInt(lastPart, 10);
    
    if (isNaN(correlative)) {
      console.warn('Last part is not a number:', lastPart);
      return current;
    }

    const newCorrelative = (correlative + 1).toString().padStart(lastPart.length, '0');
    const newParts = [...parts.slice(0, -1), newCorrelative];
    return newParts.join('-');
  } catch (error) {
    console.error('Error incrementing invoice number:', error);
    return current;
  }
}

function isInvoiceNumberInRange(current, start, end) {
  if (!current || !start || !end) {
    return true;
  }

  try {
    const currentParts = current.split('-');
    const startParts = start.split('-');
    const endParts = end.split('-');

    if (currentParts.length === startParts.length && 
        currentParts.length === endParts.length &&
        currentParts.length >= 2) {
      
      const prefixLength = currentParts.length - 1;
      const currentPrefix = currentParts.slice(0, prefixLength).join('-');
      const startPrefix = startParts.slice(0, prefixLength).join('-');
      const endPrefix = endParts.slice(0, prefixLength).join('-');

      if (currentPrefix === startPrefix && currentPrefix === endPrefix) {
        const currentNum = parseInt(currentParts[prefixLength], 10);
        const startNum = parseInt(startParts[prefixLength], 10);
        const endNum = parseInt(endParts[prefixLength], 10);

        if (!isNaN(currentNum) && !isNaN(startNum) && !isNaN(endNum)) {
          return currentNum >= startNum && currentNum <= endNum;
        }
      }
    }

    const currentNum = parseInt(current.replace(/\D/g, ''), 10);
    const startNum = parseInt(start.replace(/\D/g, ''), 10);
    const endNum = parseInt(end.replace(/\D/g, ''), 10);

    if (!isNaN(currentNum) && !isNaN(startNum) && !isNaN(endNum)) {
      return currentNum >= startNum && currentNum <= endNum;
    }

    return current >= start && current <= end;
  } catch (error) {
    console.warn('Error checking invoice range:', error);
    return true;
  }
}

function isValidInvoiceNumberFormat(invoiceNumber) {
  if (!invoiceNumber || typeof invoiceNumber !== 'string') {
    return false;
  }

  const trimmed = invoiceNumber.trim();
  if (trimmed.length === 0 || trimmed.length > 50) {
    return false;
  }

  const standardPattern = /^\d{3}-\d{3}-\d{2}-\d{8}$/;
  if (standardPattern.test(trimmed)) {
    return true;
  }

  const flexiblePattern = /^[\d-]+$/;
  if (flexiblePattern.test(trimmed)) {
    return true;
  }

  const alphanumericPattern = /^[A-Za-z0-9-]+$/;
  return alphanumericPattern.test(trimmed);
}

// Test Suite
console.log('=== Invoice Number Format Tests ===\n');

const tests = [
  {
    name: 'Standard Format (4 parts)',
    number: '000-001-01-00000001',
    expected: '000-001-01-00000002',
    rangeStart: '000-001-01-00000001',
    rangeEnd: '000-001-01-00005000',
  },
  {
    name: 'Short Format (3 parts)',
    number: '001-01-00000001',
    expected: '001-01-00000002',
    rangeStart: '001-01-00000001',
    rangeEnd: '001-01-00005000',
  },
  {
    name: 'Simple Format (2 parts)',
    number: '001-00000001',
    expected: '001-00000002',
    rangeStart: '001-00000001',
    rangeEnd: '001-00005000',
  },
  {
    name: 'No Dashes',
    number: '00000001',
    expected: '00000002',
    rangeStart: '00000001',
    rangeEnd: '00005000',
  },
  {
    name: 'Alphanumeric',
    number: 'ABC-001-00000001',
    expected: 'ABC-001-00000002',
    rangeStart: 'ABC-001-00000001',
    rangeEnd: 'ABC-001-00005000',
  },
  {
    name: 'Leading Zeros Preserved',
    number: '000-001-01-00000099',
    expected: '000-001-01-00000100',
    rangeStart: '000-001-01-00000001',
    rangeEnd: '000-001-01-00005000',
  },
];

let passed = 0;
let failed = 0;

tests.forEach((test) => {
  console.log(`Test: ${test.name}`);
  console.log(`  Input: ${test.number}`);
  
  // Test increment
  const incremented = incrementInvoiceNumber(test.number);
  const incrementPass = incremented === test.expected;
  console.log(`  Increment: ${incremented} ${incrementPass ? '✅' : '❌'} (expected: ${test.expected})`);
  
  // Test range
  const inRange = isInvoiceNumberInRange(test.number, test.rangeStart, test.rangeEnd);
  console.log(`  In Range: ${inRange} ${inRange ? '✅' : '❌'}`);
  
  // Test validation
  const isValid = isValidInvoiceNumberFormat(test.number);
  console.log(`  Valid Format: ${isValid} ${isValid ? '✅' : '❌'}`);
  
  if (incrementPass && inRange && isValid) {
    passed++;
    console.log(`  Result: PASS ✅\n`);
  } else {
    failed++;
    console.log(`  Result: FAIL ❌\n`);
  }
});

// Edge cases
console.log('=== Edge Cases ===\n');

const edgeCases = [
  { input: '', desc: 'Empty string' },
  { input: null, desc: 'Null' },
  { input: undefined, desc: 'Undefined' },
  { input: 'ABC-XYZ', desc: 'Non-numeric last part' },
  { input: '999', desc: 'Simple number' },
];

edgeCases.forEach((testCase) => {
  console.log(`Edge Case: ${testCase.desc}`);
  console.log(`  Input: ${testCase.input}`);
  
  try {
    const incremented = incrementInvoiceNumber(testCase.input);
    console.log(`  Increment: ${incremented} ✅`);
  } catch (error) {
    console.log(`  Increment: ERROR ❌ - ${error.message}`);
  }
  
  try {
    const isValid = isValidInvoiceNumberFormat(testCase.input);
    console.log(`  Valid: ${isValid} ✅\n`);
  } catch (error) {
    console.log(`  Valid: ERROR ❌ - ${error.message}\n`);
  }
});

console.log('=== Summary ===');
console.log(`Passed: ${passed}/${tests.length}`);
console.log(`Failed: ${failed}/${tests.length}`);
console.log(`Success Rate: ${((passed / tests.length) * 100).toFixed(1)}%`);

if (failed === 0) {
  console.log('\n🎉 All tests passed!');
} else {
  console.log('\n⚠️ Some tests failed. Review the output above.');
}

