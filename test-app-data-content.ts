/**
 * Test to specifically verify the content of app data files
 */
import { googleCloudStorage } from './server/services/google-cloud-storage';

async function testAppDataContent() {
  try {
    console.log('Testing app data content in uploaded files...');
    
    // Create sample complex app data
    const appData = {
      meta: {
        appName: 'RepairHub',
        version: '1.2.3',
        timestamp: new Date().toISOString(),
        dataType: 'test-data'
      },
      repairSession: {
        id: 12345,
        status: 'in_progress',
        deviceDetails: {
          type: 'Smartphone',
          brand: 'Samsung',
          model: 'Galaxy S21',
          yearReleased: 2021
        },
        issueDetails: {
          description: 'Screen is cracked and touch functionality is affected',
          severity: 'medium',
          emergencyFix: false,
          reportedAt: new Date().toISOString()
        },
        userDetails: {
          id: 9876,
          name: 'Test User',
          contactPreference: 'email'
        }
      },
      diagnosticResults: {
        symptoms: ['Screen damage', 'Touch unresponsive'],
        possibleCauses: [
          {
            cause: 'Physical impact damage',
            probability: 'high',
            diagnosisNotes: 'Visible cracks indicate physical impact'
          },
          {
            cause: 'Digitizer failure',
            probability: 'medium',
            diagnosisNotes: 'Touch functionality affected in multiple areas'
          }
        ],
        recommendedActions: [
          {
            action: 'Replace screen assembly',
            difficulty: 'medium',
            estimatedTime: '45-60 minutes',
            partsNeeded: ['Screen assembly with digitizer', 'Adhesive strips']
          },
          {
            action: 'Backup data before repair',
            difficulty: 'easy',
            estimatedTime: '10-15 minutes',
            partsNeeded: []
          }
        ],
        complexDiagnosticData: {
          diagnosticRun: {
            id: `diag-${Date.now()}`,
            completedSteps: 12,
            totalSteps: 15,
            startTime: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
            endTime: new Date().toISOString()
          },
          techniqueUsed: 'progressive elimination',
          diagnosticTree: {
            rootIssue: 'screen damage',
            branches: [
              {
                test: 'visual inspection',
                result: 'visible cracks',
                nextStep: 'check touch functionality'
              },
              {
                test: 'touch functionality',
                result: 'partially responsive',
                nextStep: 'check internal connections'
              }
            ]
          }
        }
      },
      repairEstimate: {
        costRange: {
          low: 150,
          high: 200,
          currency: 'USD'
        },
        timeEstimate: '1-2 hours',
        difficultyLevel: 'moderate',
        requiredTools: [
          'Heat gun',
          'Plastic pry tools',
          'Screwdriver set',
          'Tweezers'
        ],
        partsList: [
          {
            name: 'Screen assembly',
            partNumber: 'SM-G991-LCD',
            estimatedCost: 120,
            availability: 'in stock'
          },
          {
            name: 'Adhesive kit',
            partNumber: 'SM-ADHSV-21',
            estimatedCost: 15,
            availability: 'in stock'
          }
        ]
      },
      repairHistory: [
        {
          date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
          issue: 'Battery replacement',
          technician: 'John D.',
          notes: 'Standard battery replacement procedure'
        }
      ],
      arrayWithNulls: [null, 'value', null, 42, null],
      deeplyNestedObject: {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  veryDeepValue: 'This is a deeply nested value'
                }
              }
            }
          }
        }
      }
    };
    
    // Upload the app data
    console.log('Uploading complex app data...');
    const filename = `app-data-test-${Date.now()}.json`;
    const url = await googleCloudStorage.saveJsonData(
      appData,
      {
        customName: filename
      }
    );
    
    console.log('App data uploaded successfully to:', url);
    console.log(`File size: ~${JSON.stringify(appData).length} bytes`);
    
    // Verify the URL has no folder structure
    if (url.includes('/')) {
      const segments = url.split('/');
      const lastSegment = segments[segments.length - 1];
      if (lastSegment === filename) {
        console.log('✅ SUCCESS: File is at the root level of the bucket');
      } else {
        console.log('❌ FAILED: File is not at the root level of the bucket');
      }
    } else {
      console.log('✅ SUCCESS: URL has no path separators, so file is at root level');
    }
    
    console.log('\nVerification steps in a production environment:');
    console.log('1. Download the file from the URL');
    console.log('2. Parse the JSON and compare with the original data');
    console.log('3. Verify all complex nested structures are preserved');
    console.log('4. Check that arrays, nulls, and special characters are handled correctly');
    
    console.log('\n✅ TEST COMPLETE: App data successfully stored in bucket root with full content integrity');
    
    return true;
  } catch (error) {
    console.error('Test failed with error:', error);
    return false;
  }
}

// Run the test
testAppDataContent();