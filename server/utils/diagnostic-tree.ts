/**
 * Utility functions for working with diagnostic question trees (server-side)
 */

// Define types for our question tree structure
export interface QuestionNode {
  id: string;
  text: string;
  type: 'single-choice' | 'multi-choice' | 'text' | 'yes-no' | 'rating';
  choices?: {
    id: string;
    text: string;
    nextQuestionId?: string;
  }[];
  followupAudioPrompt?: string;
  followupImagePrompt?: string;
  defaultNextQuestionId?: string;
  isLeaf?: boolean;
}

export interface DiagnosticTree {
  rootQuestionId: string;
  questions: Record<string, QuestionNode>;
  metadata: {
    productCategory: string;
    subCategory?: string;
    version: number;
    createdAt: string;
    updatedAt?: string;
  };
}

/**
 * Creates a simple diagnostic tree for a product category
 */
export function createBasicDiagnosticTree(
  productCategory: string,
  subCategory?: string
): DiagnosticTree {
  const rootId = 'root';
  
  // Create a basic tree structure with an initial question and some follow-up questions
  return {
    rootQuestionId: rootId,
    questions: {
      [rootId]: {
        id: rootId,
        text: `What specific issue are you experiencing with your ${subCategory || productCategory}?`,
        type: 'single-choice',
        choices: [
          {
            id: 'not-turning-on',
            text: 'It doesn\'t turn on or power up',
            nextQuestionId: 'power-issue'
          },
          {
            id: 'unusual-noise',
            text: 'It\'s making unusual noises',
            nextQuestionId: 'noise-issue'
          },
          {
            id: 'performance-issue',
            text: 'It\'s not performing as expected',
            nextQuestionId: 'performance-issue'
          },
          {
            id: 'physical-damage',
            text: 'It has physical damage',
            nextQuestionId: 'damage-issue'
          },
          {
            id: 'other',
            text: 'Other issue',
            nextQuestionId: 'describe-issue'
          }
        ]
      },
      'power-issue': {
        id: 'power-issue',
        text: 'Let\'s troubleshoot the power issue. When did you first notice this problem?',
        type: 'single-choice',
        choices: [
          {
            id: 'just-now',
            text: 'Just now/today',
            nextQuestionId: 'power-recent'
          },
          {
            id: 'few-days',
            text: 'Within the last few days',
            nextQuestionId: 'power-recent'
          },
          {
            id: 'weeks-ago',
            text: 'Several weeks ago',
            nextQuestionId: 'power-ongoing'
          },
          {
            id: 'intermittent',
            text: 'It\'s been intermittent for a while',
            nextQuestionId: 'power-intermittent'
          }
        ],
        followupImagePrompt: 'If possible, please upload a photo of the power connection or any visible damage.'
      },
      'power-recent': {
        id: 'power-recent',
        text: 'Have you tried any of these basic troubleshooting steps?',
        type: 'multi-choice',
        choices: [
          {
            id: 'different-outlet',
            text: 'Tried a different power outlet',
          },
          {
            id: 'different-cable',
            text: 'Tried a different power cable',
          },
          {
            id: 'reset',
            text: 'Performed a reset (if applicable)',
          },
          {
            id: 'battery-check',
            text: 'Checked/replaced the battery (if applicable)',
          },
          {
            id: 'none',
            text: 'None of the above',
          }
        ],
        defaultNextQuestionId: 'power-diagnosis'
      },
      'power-ongoing': {
        id: 'power-ongoing',
        text: 'Has anything changed in how you use the device since the problem started?',
        type: 'yes-no',
        defaultNextQuestionId: 'power-diagnosis'
      },
      'power-intermittent': {
        id: 'power-intermittent',
        text: 'Can you describe any pattern to when the device will or won\'t power on?',
        type: 'text',
        defaultNextQuestionId: 'power-diagnosis'
      },
      'power-diagnosis': {
        id: 'power-diagnosis',
        text: 'Based on your responses, the issue might be with:',
        type: 'single-choice',
        choices: [
          {
            id: 'power-supply',
            text: 'Power supply or adapter',
            nextQuestionId: 'final-instructions'
          },
          {
            id: 'battery',
            text: 'Internal battery',
            nextQuestionId: 'final-instructions'
          },
          {
            id: 'power-button',
            text: 'Power button or switch',
            nextQuestionId: 'final-instructions'
          },
          {
            id: 'internal-component',
            text: 'Internal component failure',
            nextQuestionId: 'final-instructions'
          }
        ],
        isLeaf: false
      },
      'noise-issue': {
        id: 'noise-issue',
        text: 'Can you describe the noise you\'re hearing?',
        type: 'single-choice',
        choices: [
          {
            id: 'grinding',
            text: 'Grinding or scraping',
            nextQuestionId: 'noise-location'
          },
          {
            id: 'clicking',
            text: 'Clicking or ticking',
            nextQuestionId: 'noise-location'
          },
          {
            id: 'buzzing',
            text: 'Buzzing or electrical noise',
            nextQuestionId: 'noise-location'
          },
          {
            id: 'fan-noise',
            text: 'Fan noise or whirring',
            nextQuestionId: 'noise-location'
          },
          {
            id: 'other-noise',
            text: 'Other noise',
            nextQuestionId: 'noise-location'
          }
        ],
        followupAudioPrompt: 'If possible, please record the noise so we can better diagnose the issue.'
      },
      'noise-location': {
        id: 'noise-location',
        text: 'Where is the noise coming from?',
        type: 'single-choice',
        choices: [
          {
            id: 'front',
            text: 'Front of the device',
            nextQuestionId: 'noise-timing'
          },
          {
            id: 'back',
            text: 'Back of the device',
            nextQuestionId: 'noise-timing'
          },
          {
            id: 'top',
            text: 'Top of the device',
            nextQuestionId: 'noise-timing'
          },
          {
            id: 'bottom',
            text: 'Bottom of the device',
            nextQuestionId: 'noise-timing'
          },
          {
            id: 'inside',
            text: 'Inside the device',
            nextQuestionId: 'noise-timing'
          },
          {
            id: 'not-sure',
            text: 'Not sure',
            nextQuestionId: 'noise-timing'
          }
        ]
      },
      'noise-timing': {
        id: 'noise-timing',
        text: 'When do you hear the noise?',
        type: 'single-choice',
        choices: [
          {
            id: 'startup',
            text: 'During startup/power on',
            nextQuestionId: 'final-instructions'
          },
          {
            id: 'shutdown',
            text: 'During shutdown/power off',
            nextQuestionId: 'final-instructions'
          },
          {
            id: 'continuous',
            text: 'Continuously while operating',
            nextQuestionId: 'final-instructions'
          },
          {
            id: 'under-load',
            text: 'Only under heavy use/load',
            nextQuestionId: 'final-instructions'
          },
          {
            id: 'intermittent-noise',
            text: 'Intermittently',
            nextQuestionId: 'final-instructions'
          }
        ]
      },
      'performance-issue': {
        id: 'performance-issue',
        text: 'What type of performance issue are you experiencing?',
        type: 'single-choice',
        choices: [
          {
            id: 'slow',
            text: 'Slow or sluggish operation',
            nextQuestionId: 'performance-timing'
          },
          {
            id: 'freezing',
            text: 'Freezing or hanging',
            nextQuestionId: 'performance-timing'
          },
          {
            id: 'overheating',
            text: 'Overheating',
            nextQuestionId: 'performance-timing'
          },
          {
            id: 'battery-drain',
            text: 'Battery drains quickly',
            nextQuestionId: 'performance-timing'
          },
          {
            id: 'functionality',
            text: 'Specific function not working',
            nextQuestionId: 'performance-timing'
          }
        ]
      },
      'performance-timing': {
        id: 'performance-timing',
        text: 'How long have you been experiencing this issue?',
        type: 'single-choice',
        choices: [
          {
            id: 'just-started',
            text: 'Just started recently',
            nextQuestionId: 'performance-changes'
          },
          {
            id: 'gradually',
            text: 'Gradually getting worse over time',
            nextQuestionId: 'performance-changes'
          },
          {
            id: 'after-event',
            text: 'After a specific event (update, drop, etc.)',
            nextQuestionId: 'performance-changes'
          },
          {
            id: 'always',
            text: 'Since I got the device',
            nextQuestionId: 'performance-changes'
          }
        ]
      },
      'performance-changes': {
        id: 'performance-changes',
        text: 'Have you made any recent changes or updates to the device?',
        type: 'multi-choice',
        choices: [
          {
            id: 'software-update',
            text: 'Software or firmware update',
          },
          {
            id: 'hardware-change',
            text: 'Hardware change or upgrade',
          },
          {
            id: 'new-software',
            text: 'Installed new software/apps',
          },
          {
            id: 'settings-change',
            text: 'Changed settings',
          },
          {
            id: 'no-changes',
            text: 'No recent changes',
          }
        ],
        defaultNextQuestionId: 'final-instructions'
      },
      'damage-issue': {
        id: 'damage-issue',
        text: 'What type of physical damage has occurred?',
        type: 'single-choice',
        choices: [
          {
            id: 'screen-damage',
            text: 'Screen damage (cracks, display issues)',
            nextQuestionId: 'damage-cause'
          },
          {
            id: 'water-damage',
            text: 'Water/liquid damage',
            nextQuestionId: 'damage-cause'
          },
          {
            id: 'drop-damage',
            text: 'Drop damage (dents, broken parts)',
            nextQuestionId: 'damage-cause'
          },
          {
            id: 'connection-damage',
            text: 'Connection damage (ports, plugs)',
            nextQuestionId: 'damage-cause'
          },
          {
            id: 'cosmetic-damage',
            text: 'Cosmetic damage only',
            nextQuestionId: 'damage-cause'
          }
        ],
        followupImagePrompt: 'Please upload an image of the damaged area if possible.'
      },
      'damage-cause': {
        id: 'damage-cause',
        text: 'How did the damage occur?',
        type: 'single-choice',
        choices: [
          {
            id: 'accident-drop',
            text: 'Accidental drop',
            nextQuestionId: 'damage-function'
          },
          {
            id: 'accident-liquid',
            text: 'Liquid spill/exposure',
            nextQuestionId: 'damage-function'
          },
          {
            id: 'accident-impact',
            text: 'Impact from another object',
            nextQuestionId: 'damage-function'
          },
          {
            id: 'gradual-wear',
            text: 'Gradual wear and tear',
            nextQuestionId: 'damage-function'
          },
          {
            id: 'unknown-cause',
            text: 'Unknown cause',
            nextQuestionId: 'damage-function'
          }
        ]
      },
      'damage-function': {
        id: 'damage-function',
        text: 'Is the device still functioning despite the damage?',
        type: 'yes-no',
        defaultNextQuestionId: 'final-instructions'
      },
      'describe-issue': {
        id: 'describe-issue',
        text: 'Please describe your issue in as much detail as possible:',
        type: 'text',
        defaultNextQuestionId: 'final-instructions',
        followupImagePrompt: 'If relevant, please upload an image that helps illustrate the problem.'
      },
      'final-instructions': {
        id: 'final-instructions',
        text: 'Based on your responses, we recommend the following:',
        type: 'single-choice',
        choices: [
          {
            id: 'diy-repair',
            text: 'Try a DIY repair (we\'ll provide instructions)',
          },
          {
            id: 'professional-repair',
            text: 'Seek professional repair service',
          },
          {
            id: 'replacement-parts',
            text: 'Order replacement parts',
          },
          {
            id: 'replacement-device',
            text: 'Consider device replacement',
          }
        ],
        isLeaf: true
      }
    },
    metadata: {
      productCategory,
      subCategory,
      version: 1,
      createdAt: new Date().toISOString()
    }
  };
}

/**
 * Converts a tree to the format expected by the database
 */
export function treeToDbFormat(tree: DiagnosticTree) {
  return {
    productCategory: tree.metadata.productCategory,
    subCategory: tree.metadata.subCategory || null,
    version: tree.metadata.version,
    treeData: JSON.stringify(tree)
  };
}