// Simple test file for pricing calculations
// This is not a comprehensive test suite but helps verify basic functionality

import { calculateLessonPrice, calculateCourtPrice } from './pricing';

// Mock user ID for testing
const TEST_USER_ID = 'test-user-123';

// Test lesson pricing calculation
export const testLessonPricing = async () => {
  console.log('=== Testing Lesson Pricing ===');
  
  try {
    // Test with $75/hour coach for 1 hour
    const result1 = await calculateLessonPrice(TEST_USER_ID, 75, 1);
    console.log('Lesson pricing (75/hr, 1 hour):', result1);
    
    // Test with $100/hour coach for 2 hours
    const result2 = await calculateLessonPrice(TEST_USER_ID, 100, 2);
    console.log('Lesson pricing (100/hr, 2 hours):', result2);
    
    // Verify pricing structure
    if (result1.basePrice === 75 && result2.basePrice === 200) {
      console.log('✅ Base pricing calculation correct');
    } else {
      console.error('❌ Base pricing calculation incorrect');
    }
    
    return { result1, result2 };
  } catch (error) {
    console.error('Error testing lesson pricing:', error);
    return null;
  }
};

// Test court pricing calculation
export const testCourtPricing = async () => {
  console.log('=== Testing Court Pricing ===');
  
  try {
    // Test with $25/hour court for 1 hour
    const result1 = await calculateCourtPrice(TEST_USER_ID, 25, 1);
    console.log('Court pricing (25/hr, 1 hour):', result1);
    
    // Test with $30/hour court for 3 hours
    const result2 = await calculateCourtPrice(TEST_USER_ID, 30, 3);
    console.log('Court pricing (30/hr, 3 hours):', result2);
    
    // Verify pricing structure
    if (result1.basePrice === 25 && result2.basePrice === 90) {
      console.log('✅ Base court pricing calculation correct');
    } else {
      console.error('❌ Base court pricing calculation incorrect');
    }
    
    return { result1, result2 };
  } catch (error) {
    console.error('Error testing court pricing:', error);
    return null;
  }
};

// Run all tests
export const runPricingTests = async () => {
  console.log('🧪 Starting Pricing Tests...\n');
  
  const lessonResults = await testLessonPricing();
  console.log('\n');
  const courtResults = await testCourtPricing();
  
  console.log('\n🏁 Pricing Tests Complete');
  
  return {
    lesson: lessonResults,
    court: courtResults
  };
};

// Export for manual testing
export default {
  testLessonPricing,
  testCourtPricing,
  runPricingTests
};