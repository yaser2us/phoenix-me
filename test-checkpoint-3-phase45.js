import { ApiRegistry } from './src/registry/api-registry.js';
import { EnhancedSemanticMatcher } from './src/nlp/enhanced-semantic-matcher.js';
import { logger } from './src/utils/logger.js';

/**
 * Phase 4.5 - Checkpoint 3: Enhanced Semantic Intent Matching
 * Tests advanced NLP capabilities for multi-domain intent recognition
 */
async function runCheckpoint3Tests() {
  console.log('🚀 Phase 4.5 - Checkpoint 3: Enhanced Semantic Intent Matching');
  console.log('='.repeat(75));
  console.log('Testing advanced NLP and multi-domain intent recognition...\n');

  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  try {
    // Initialize components
    const apiRegistry = new ApiRegistry();
    await apiRegistry.initialize();
    
    const semanticMatcher = new EnhancedSemanticMatcher(apiRegistry);

    // Test 1: Multi-Domain Intent Classification
    await testMultiDomainClassification(semanticMatcher, results);

    // Test 2: Entity Recognition and Context Extraction
    await testEntityRecognition(semanticMatcher, results);

    // Test 3: Confidence Scoring and Ranking
    await testConfidenceScoring(semanticMatcher, results);

    // Test 4: Ambiguity Detection and Resolution
    await testAmbiguityResolution(semanticMatcher, results);

    // Test 5: Context-Aware Learning and Pattern Recognition
    await testContextAwareLearning(semanticMatcher, results);

  } catch (error) {
    logger.error('Test suite failed:', error);
    results.failed++;
  }

  // Print summary
  printTestSummary(results);
}

/**
 * Test 1: Multi-Domain Intent Classification
 */
async function testMultiDomainClassification(matcher, results) {
  console.log('\n🧪 Test 1: Multi-Domain Intent Classification');
  console.log('='.repeat(50));
  
  const testName = 'Multi-Domain Classification';
  
  try {
    const testCases = [
      {
        intent: "Check my bank balance and get weather for Singapore",
        expectedDomains: ['banking', 'weather'],
        description: "Banking + Weather"
      },
      {
        intent: "Transfer money to John, find ATMs nearby, and check USD exchange rate",
        expectedDomains: ['banking', 'location', 'currency'],
        description: "Banking + Location + Currency"
      },
      {
        intent: "What's the weather like for outdoor dining in Bangkok?",
        expectedDomains: ['weather', 'location'],
        description: "Weather + Location"
      },
      {
        intent: "I need restaurant recommendations and currency conversion rates",
        expectedDomains: ['location', 'currency'],
        description: "Location + Currency"
      }
    ];

    console.log('🎯 Testing Multi-Domain Intent Classification:');
    let successfulClassifications = 0;

    for (const testCase of testCases) {
      console.log(`\n   Intent: "${testCase.intent}"`);
      console.log(`   Expected: ${testCase.expectedDomains.join(', ')}`);
      
      const result = await matcher.performSemanticMatching(testCase.intent);
      
      const detectedDomains = result.context.domains.map(d => d.domain);
      const domainMatches = testCase.expectedDomains.filter(expected => 
        detectedDomains.includes(expected)
      );
      
      console.log(`   Detected: ${detectedDomains.join(', ')}`);
      console.log(`   Match Rate: ${domainMatches.length}/${testCase.expectedDomains.length}`);
      console.log(`   Overall Confidence: ${(result.confidence * 100).toFixed(0)}%`);
      
      // Show top domain confidences
      if (result.context.domains.length > 0) {
        console.log('   Domain Confidences:');
        result.context.domains.slice(0, 3).forEach(domain => {
          console.log(`     - ${domain.domain}: ${(domain.confidence * 100).toFixed(0)}%`);
        });
      }
      
      const isSuccessful = domainMatches.length >= testCase.expectedDomains.length * 0.8;
      console.log(`   Result: ${isSuccessful ? '✅ PASSED' : '❌ FAILED'}`);
      
      if (isSuccessful) successfulClassifications++;
    }

    const allClassificationsWorking = successfulClassifications === testCases.length;
    
    console.log(`\n📊 Classification Summary: ${successfulClassifications}/${testCases.length} successful`);
    
    if (allClassificationsWorking) {
      console.log('\n✅ PASSED: Multi-domain classification working correctly');
      results.passed++;
    } else {
      console.log('\n❌ FAILED: Some classifications incomplete');
      results.failed++;
    }
    
    results.tests.push({
      name: testName,
      passed: allClassificationsWorking,
      successRate: (successfulClassifications / testCases.length) * 100
    });
    
  } catch (error) {
    console.log(`\n❌ FAILED: ${error.message}`);
    results.failed++;
    results.tests.push({
      name: testName,
      passed: false,
      error: error.message
    });
  }
}

/**
 * Test 2: Entity Recognition and Context Extraction
 */
async function testEntityRecognition(matcher, results) {
  console.log('\n🧪 Test 2: Entity Recognition and Context Extraction');
  console.log('='.repeat(55));
  
  const testName = 'Entity Recognition';
  
  try {
    const testCases = [
      {
        intent: "Check weather in Kuala Lumpur and find restaurants there",
        expectedEntities: {
          locations: ['Kuala Lumpur'],
          currencies: [],
          amounts: [],
          people: []
        }
      },
      {
        intent: "Transfer $500 to John and convert USD to MYR",
        expectedEntities: {
          locations: [],
          currencies: ['USD', 'MYR'],
          amounts: ['500'],
          people: ['John']
        }
      },
      {
        intent: "Send 1000 SGD to Alice for dinner in Singapore",
        expectedEntities: {
          locations: ['Singapore'],
          currencies: ['SGD'],
          amounts: ['1000'],
          people: ['Alice']
        }
      }
    ];

    console.log('🔍 Testing Entity Recognition:');
    let successfulExtractions = 0;

    for (const testCase of testCases) {
      console.log(`\n   Intent: "${testCase.intent}"`);
      
      const result = await matcher.performSemanticMatching(testCase.intent);
      const entities = result.context.entities;
      
      console.log('   Extracted Entities:');
      console.log(`     Locations: [${entities.locations.join(', ')}]`);
      console.log(`     Currencies: [${entities.currencies.join(', ')}]`);
      console.log(`     Amounts: [${entities.amounts.join(', ')}]`);
      console.log(`     People: [${entities.people.join(', ')}]`);
      
      // Check entity extraction accuracy
      let correctExtractions = 0;
      let totalExpected = 0;
      
      for (const [entityType, expectedList] of Object.entries(testCase.expectedEntities)) {
        totalExpected += expectedList.length;
        const extractedList = entities[entityType] || [];
        
        for (const expected of expectedList) {
          if (extractedList.some(extracted => 
            extracted.toLowerCase().includes(expected.toLowerCase()) ||
            expected.toLowerCase().includes(extracted.toLowerCase())
          )) {
            correctExtractions++;
          }
        }
      }
      
      const extractionAccuracy = totalExpected > 0 ? correctExtractions / totalExpected : 1;
      console.log(`   Accuracy: ${(extractionAccuracy * 100).toFixed(0)}% (${correctExtractions}/${totalExpected})`);
      
      const isSuccessful = extractionAccuracy >= 0.7;
      console.log(`   Result: ${isSuccessful ? '✅ PASSED' : '❌ FAILED'}`);
      
      if (isSuccessful) successfulExtractions++;
    }

    // Test sentiment analysis
    console.log('\n😊 Testing Sentiment Analysis:');
    const sentimentTests = [
      { intent: "Please help me check my balance urgently", expected: 'urgent' },
      { intent: "Thank you for the great service", expected: 'positive' },
      { intent: "There's a problem with my account", expected: 'negative' },
      { intent: "Check my balance", expected: 'neutral' }
    ];

    let correctSentiments = 0;
    for (const test of sentimentTests) {
      const result = await matcher.performSemanticMatching(test.intent);
      const detected = result.context.sentiment;
      const isCorrect = detected === test.expected;
      
      console.log(`   "${test.intent}" → ${detected} ${isCorrect ? '✅' : '❌'}`);
      if (isCorrect) correctSentiments++;
    }

    const allExtractionsWorking = successfulExtractions === testCases.length;
    const sentimentWorking = correctSentiments >= sentimentTests.length * 0.75;
    
    console.log(`\n📊 Entity Extraction: ${successfulExtractions}/${testCases.length} successful`);
    console.log(`📊 Sentiment Analysis: ${correctSentiments}/${sentimentTests.length} correct`);
    
    if (allExtractionsWorking && sentimentWorking) {
      console.log('\n✅ PASSED: Entity recognition and context extraction working');
      results.passed++;
    } else {
      console.log('\n❌ FAILED: Entity recognition needs improvement');
      results.failed++;
    }
    
    results.tests.push({
      name: testName,
      passed: allExtractionsWorking && sentimentWorking,
      entityAccuracy: (successfulExtractions / testCases.length) * 100,
      sentimentAccuracy: (correctSentiments / sentimentTests.length) * 100
    });
    
  } catch (error) {
    console.log(`\n❌ FAILED: ${error.message}`);
    results.failed++;
    results.tests.push({
      name: testName,
      passed: false,
      error: error.message
    });
  }
}

/**
 * Test 3: Confidence Scoring and Ranking
 */
async function testConfidenceScoring(matcher, results) {
  console.log('\n🧪 Test 3: Confidence Scoring and Ranking');
  console.log('='.repeat(45));
  
  const testName = 'Confidence Scoring';
  
  try {
    const testCases = [
      {
        intent: "Check my account balance",
        expectedHighConfidence: true,
        description: "Clear, specific intent"
      },
      {
        intent: "get banking getBalance operation",
        expectedHighConfidence: true,
        description: "Direct API operation reference"
      },
      {
        intent: "I need some information about stuff",
        expectedHighConfidence: false,
        description: "Vague, ambiguous intent"
      },
      {
        intent: "Weather forecast for business meeting location planning",
        expectedHighConfidence: true,
        description: "Complex but clear intent"
      }
    ];

    console.log('📊 Testing Confidence Scoring:');
    let appropriateScoring = 0;

    for (const testCase of testCases) {
      console.log(`\n   Intent: "${testCase.intent}"`);
      console.log(`   Expected: ${testCase.expectedHighConfidence ? 'High' : 'Low'} confidence`);
      
      const result = await matcher.performSemanticMatching(testCase.intent);
      
      console.log(`   Overall Confidence: ${(result.confidence * 100).toFixed(0)}%`);
      console.log(`   Match Results: ${result.matchResults.length} operations found`);
      
      if (result.matchResults.length > 0) {
        console.log('   Top Matches:');
        result.matchResults.slice(0, 3).forEach((match, index) => {
          console.log(`     ${index + 1}. ${match.operationId} (${(match.confidence * 100).toFixed(0)}%) - ${match.matchType}`);
        });
      }

      const isHighConfidence = result.confidence > 0.6;
      const scoringCorrect = isHighConfidence === testCase.expectedHighConfidence;
      
      console.log(`   Detected: ${isHighConfidence ? 'High' : 'Low'} confidence`);
      console.log(`   Result: ${scoringCorrect ? '✅ PASSED' : '❌ FAILED'}`);
      
      if (scoringCorrect) appropriateScoring++;
    }

    // Test ranking consistency
    console.log('\n🔢 Testing Match Ranking:');
    const rankingTest = "Check my balance and transfer money";
    const rankingResult = await matcher.performSemanticMatching(rankingTest);
    
    console.log(`   Intent: "${rankingTest}"`);
    console.log('   Ranking Order:');
    
    let rankingConsistent = true;
    for (let i = 0; i < rankingResult.matchResults.length - 1 && i < 4; i++) {
      const current = rankingResult.matchResults[i];
      const next = rankingResult.matchResults[i + 1];
      
      console.log(`     ${i + 1}. ${current.operationId} (${(current.confidence * 100).toFixed(0)}%)`);
      
      if (current.confidence < next.confidence) {
        rankingConsistent = false;
      }
    }
    
    if (rankingResult.matchResults.length > 0) {
      const last = rankingResult.matchResults[Math.min(4, rankingResult.matchResults.length - 1)];
      console.log(`     ${Math.min(5, rankingResult.matchResults.length)}. ${last.operationId} (${(last.confidence * 100).toFixed(0)}%)`);
    }

    const allScoringCorrect = appropriateScoring === testCases.length;
    
    console.log(`\n📊 Confidence Scoring: ${appropriateScoring}/${testCases.length} appropriate`);
    console.log(`📊 Ranking Consistency: ${rankingConsistent ? 'Maintained' : 'Broken'}`);
    
    if (allScoringCorrect && rankingConsistent) {
      console.log('\n✅ PASSED: Confidence scoring and ranking working correctly');
      results.passed++;
    } else {
      console.log('\n❌ FAILED: Confidence scoring or ranking needs improvement');
      results.failed++;
    }
    
    results.tests.push({
      name: testName,
      passed: allScoringCorrect && rankingConsistent,
      scoringAccuracy: (appropriateScoring / testCases.length) * 100,
      rankingConsistent
    });
    
  } catch (error) {
    console.log(`\n❌ FAILED: ${error.message}`);
    results.failed++;
    results.tests.push({
      name: testName,
      passed: false,
      error: error.message
    });
  }
}

/**
 * Test 4: Ambiguity Detection and Resolution
 */
async function testAmbiguityResolution(matcher, results) {
  console.log('\n🧪 Test 4: Ambiguity Detection and Resolution');
  console.log('='.repeat(50));
  
  const testName = 'Ambiguity Resolution';
  
  try {
    const testCases = [
      {
        intent: "I need money",
        expectedAmbiguity: true,
        description: "Ambiguous: could be balance check, transfer, or ATM"
      },
      {
        intent: "Help me with my account",
        expectedAmbiguity: true,
        description: "Ambiguous: multiple account operations possible"
      },
      {
        intent: "get banking getBalance with isFirstLoad true",
        expectedAmbiguity: false,
        description: "Specific: direct API operation call"
      },
      {
        intent: "Show me weather and restaurants",
        expectedAmbiguity: false,
        description: "Clear: two distinct operations"
      }
    ];

    console.log('🤔 Testing Ambiguity Detection:');
    let correctDetections = 0;

    for (const testCase of testCases) {
      console.log(`\n   Intent: "${testCase.intent}"`);
      console.log(`   Expected: ${testCase.expectedAmbiguity ? 'Ambiguous' : 'Clear'}`);
      
      const result = await matcher.performSemanticMatching(testCase.intent);
      const ambiguity = result.ambiguity;
      
      console.log(`   Detected: ${ambiguity.detected ? 'Ambiguous' : 'Clear'}`);
      
      if (ambiguity.detected) {
        console.log(`   Alternatives: ${ambiguity.alternatives.length}`);
        if (ambiguity.alternatives.length > 0) {
          ambiguity.alternatives.slice(0, 2).forEach((alt, index) => {
            console.log(`     ${index + 1}. ${alt.operationId} (${(alt.confidence * 100).toFixed(0)}%)`);
          });
        }
        
        if (ambiguity.resolution) {
          console.log(`   Resolution: ${ambiguity.resolution.strategy || ambiguity.resolution}`);
          if (ambiguity.resolution.chosen) {
            console.log(`   Chosen: ${ambiguity.resolution.chosen.operationId}`);
          }
        }
      }

      const detectionCorrect = ambiguity.detected === testCase.expectedAmbiguity;
      console.log(`   Result: ${detectionCorrect ? '✅ PASSED' : '❌ FAILED'}`);
      
      if (detectionCorrect) correctDetections++;
    }

    // Test resolution strategies
    console.log('\n🔧 Testing Resolution Strategies:');
    const resolutionTest = "transfer or send money";
    const resolutionResult = await matcher.performSemanticMatching(resolutionTest);
    
    console.log(`   Intent: "${resolutionTest}"`);
    if (resolutionResult.ambiguity.detected && resolutionResult.ambiguity.resolution) {
      const resolution = resolutionResult.ambiguity.resolution;
      console.log(`   Strategy: ${resolution.strategy}`);
      console.log(`   Reasoning: ${resolution.reason}`);
      console.log(`   Resolution working: ✅`);
    } else {
      console.log('   No ambiguity detected or resolution failed: ❌');
    }

    const allDetectionsCorrect = correctDetections === testCases.length;
    const resolutionWorking = resolutionResult.ambiguity.resolution !== null;
    
    console.log(`\n📊 Ambiguity Detection: ${correctDetections}/${testCases.length} correct`);
    console.log(`📊 Resolution Strategy: ${resolutionWorking ? 'Working' : 'Not working'}`);
    
    if (allDetectionsCorrect && resolutionWorking) {
      console.log('\n✅ PASSED: Ambiguity detection and resolution working');
      results.passed++;
    } else {
      console.log('\n❌ FAILED: Ambiguity handling needs improvement');
      results.failed++;
    }
    
    results.tests.push({
      name: testName,
      passed: allDetectionsCorrect && resolutionWorking,
      detectionAccuracy: (correctDetections / testCases.length) * 100,
      resolutionWorking
    });
    
  } catch (error) {
    console.log(`\n❌ FAILED: ${error.message}`);
    results.failed++;
    results.tests.push({
      name: testName,
      passed: false,
      error: error.message
    });
  }
}

/**
 * Test 5: Context-Aware Learning and Pattern Recognition
 */
async function testContextAwareLearning(matcher, results) {
  console.log('\n🧪 Test 5: Context-Aware Learning and Pattern Recognition');
  console.log('='.repeat(60));
  
  const testName = 'Context-Aware Learning';
  
  try {
    console.log('🧠 Testing Context Learning:');
    
    // Clear any existing history
    matcher.clearHistory();
    
    // Simulate a conversation sequence
    const conversationSequence = [
      "Check my account balance",
      "What's the weather like today?",
      "Check my balance again",  // Should benefit from context
      "Show me weather for tomorrow" // Should benefit from context
    ];

    const contextResults = [];
    
    for (const [index, intent] of conversationSequence.entries()) {
      console.log(`\n   Step ${index + 1}: "${intent}"`);
      
      const result = await matcher.performSemanticMatching(intent, {
        conversationStep: index + 1
      });
      
      contextResults.push({
        intent,
        confidence: result.confidence,
        topMatch: result.matchResults[0]?.operationId,
        domains: result.context.domains.map(d => d.domain)
      });
      
      console.log(`   Confidence: ${(result.confidence * 100).toFixed(0)}%`);
      console.log(`   Top Match: ${result.matchResults[0]?.operationId || 'None'}`);
      console.log(`   Domains: [${result.context.domains.map(d => d.domain).join(', ')}]`);
    }

    // Check if context improved later similar requests
    const firstBalanceConfidence = contextResults[0].confidence;
    const secondBalanceConfidence = contextResults[2].confidence;
    const contextImprovement = secondBalanceConfidence >= firstBalanceConfidence;

    console.log('\n📈 Context Learning Analysis:');
    console.log(`   First balance check confidence: ${(firstBalanceConfidence * 100).toFixed(0)}%`);
    console.log(`   Second balance check confidence: ${(secondBalanceConfidence * 100).toFixed(0)}%`);
    console.log(`   Context improvement: ${contextImprovement ? '✅ Yes' : '❌ No'}`);

    // Test user pattern learning
    console.log('\n🔄 Testing Pattern Learning:');
    
    // Repeat the same intent multiple times
    const repeatedIntent = "check my money";
    const repetitions = 3;
    
    for (let i = 0; i < repetitions; i++) {
      await matcher.performSemanticMatching(repeatedIntent);
    }
    
    const patterns = matcher.getUserPatterns();
    const learnedPattern = patterns.find(p => p.intent === repeatedIntent.toLowerCase());
    
    console.log(`   Repeated intent: "${repeatedIntent}" (${repetitions} times)`);
    console.log(`   Pattern learned: ${learnedPattern ? '✅ Yes' : '❌ No'}`);
    if (learnedPattern) {
      console.log(`   Usage count: ${learnedPattern.usage}`);
      console.log(`   Operations: [${learnedPattern.operations.join(', ')}]`);
    }

    // Test context history
    const history = matcher.getContextHistory();
    console.log(`\n📚 Context History: ${history.length} entries stored`);
    
    if (history.length > 0) {
      console.log('   Recent entries:');
      history.slice(-3).forEach((entry, index) => {
        console.log(`     ${index + 1}. "${entry.intent}" → [${entry.domains.join(', ')}]`);
      });
    }

    const contextWorking = contextImprovement;
    const patternLearning = learnedPattern !== undefined;
    const historyMaintained = history.length > 0;
    
    console.log('\n📊 Learning Capabilities:');
    console.log(`   Context improvement: ${contextWorking ? '✅' : '❌'}`);
    console.log(`   Pattern learning: ${patternLearning ? '✅' : '❌'}`);
    console.log(`   History maintenance: ${historyMaintained ? '✅' : '❌'}`);
    
    const learningWorking = contextWorking && patternLearning && historyMaintained;
    
    if (learningWorking) {
      console.log('\n✅ PASSED: Context-aware learning working correctly');
      results.passed++;
    } else {
      console.log('\n❌ FAILED: Learning capabilities need improvement');
      results.failed++;
    }
    
    results.tests.push({
      name: testName,
      passed: learningWorking,
      contextImprovement: contextWorking,
      patternLearning: patternLearning,
      historySize: history.length
    });
    
  } catch (error) {
    console.log(`\n❌ FAILED: ${error.message}`);
    results.failed++;
    results.tests.push({
      name: testName,
      passed: false,
      error: error.message
    });
  }
}

/**
 * Print test summary
 */
function printTestSummary(results) {
  console.log('\n' + '='.repeat(75));
  console.log('📊 Checkpoint 3 Test Summary');
  console.log('='.repeat(75));
  
  results.tests.forEach((test, index) => {
    console.log(`${index + 1}. ${test.name}: ${test.passed ? '✅ PASSED' : '❌ FAILED'}`);
    if (test.error) {
      console.log(`   Error: ${test.error}`);
    }
  });
  
  console.log('\n📈 Overall Results:');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📊 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(0)}%`);
  
  if (results.passed === 5) {
    console.log('\n✅ CHECKPOINT 3 COMPLETE: Outstanding performance!');
    console.log('\n🎯 Enhanced Semantic Intent Matching Successfully Implemented!');
    console.log('The system can now:');
    console.log('  ✓ Classify complex multi-domain intents accurately');
    console.log('  ✓ Extract entities and analyze context/sentiment');
    console.log('  ✓ Provide accurate confidence scoring and ranking');
    console.log('  ✓ Detect and resolve ambiguous user requests');
    console.log('  ✓ Learn from context and user interaction patterns');
    console.log('\n🚀 Ready for Checkpoint 4: Multi-Operation Workflow Execution');
  } else if (results.passed >= 4) {
    console.log('\n⚠️ CHECKPOINT 3 MOSTLY COMPLETE: Excellent progress with minor issues');
    console.log('Review failed tests and make improvements before proceeding.');
  } else if (results.passed >= 3) {
    console.log('\n⚠️ CHECKPOINT 3 PARTIALLY COMPLETE: Good foundation with some gaps');
    console.log('Address the failing components before proceeding to next checkpoint.');
  } else {
    console.log('\n❌ CHECKPOINT 3 INCOMPLETE: Significant issues detected');
    console.log('Please review and fix the failing tests before proceeding.');
  }
}

// Run the tests
runCheckpoint3Tests().catch(console.error);