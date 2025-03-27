export interface RepairEstimate {
  costRange: {
    min: number;
    max: number;
  };
  timeEstimate: string;
  difficulty: "Easy" | "Moderate" | "Hard";
  commonIssues: string[];
  recommendations: string[];
}

const mockEstimates: Record<string, RepairEstimate> = {
  // Low cost repairs
  headphones: {
    costRange: { min: 15, max: 75 },
    timeEstimate: "30-60 minutes",
    difficulty: "Easy",
    commonIssues: [
      "Audio cutting out",
      "Broken headband",
      "Ear cushion replacement"
    ],
    recommendations: [
      "DIY repair is often possible",
      "Replacement parts are typically inexpensive",
      "Consider replacement if high-end features are needed"
    ]
  },
  toaster: {
    costRange: { min: 20, max: 60 },
    timeEstimate: "30-45 minutes",
    difficulty: "Easy",
    commonIssues: [
      "Uneven toasting",
      "Lever not staying down",
      "Not heating up"
    ],
    recommendations: [
      "Simple mechanical issues can be fixed at home",
      "Electrical issues may require professional help",
      "Replacement may be more economical than repair"
    ]
  },
  
  // Medium cost repairs
  phone: {
    costRange: { min: 50, max: 200 },
    timeEstimate: "1-2 hours",
    difficulty: "Moderate",
    commonIssues: [
      "Cracked screen",
      "Battery replacement",
      "Charging port issues"
    ],
    recommendations: [
      "Consider DIY for simple repairs like battery replacement",
      "Professional repair recommended for screen replacement",
      "Check warranty status before proceeding"
    ]
  },
  tablet: {
    costRange: { min: 80, max: 250 },
    timeEstimate: "1-3 hours",
    difficulty: "Moderate",
    commonIssues: [
      "Touch screen not responding",
      "Battery draining quickly",
      "Charging issues"
    ],
    recommendations: [
      "Screen repairs often require professional tools",
      "Data backup recommended before any repair",
      "Compare repair costs to replacement value"
    ]
  },
  microwave: {
    costRange: { min: 75, max: 180 },
    timeEstimate: "1-2 hours",
    difficulty: "Moderate",
    commonIssues: [
      "Not heating properly",
      "Turntable not spinning",
      "Display not working"
    ],
    recommendations: [
      "CAUTION: Microwaves contain high-voltage capacitors that can be dangerous",
      "Professional repair recommended for internal issues",
      "Simple mechanical issues may be DIY-friendly"
    ]
  },
  
  // High cost repairs
  laptop: {
    costRange: { min: 100, max: 500 },
    timeEstimate: "2-4 hours",
    difficulty: "Hard",
    commonIssues: [
      "Won't power on",
      "Keyboard issues",
      "Screen problems"
    ],
    recommendations: [
      "Backup data before repair",
      "Professional repair recommended",
      "Consider cost vs. replacement value"
    ]
  },
  refrigerator: {
    costRange: { min: 150, max: 600 },
    timeEstimate: "3-5 hours",
    difficulty: "Hard",
    commonIssues: [
      "Not cooling properly",
      "Ice maker issues",
      "Water leaking"
    ],
    recommendations: [
      "Refrigerant issues require professional service",
      "Some mechanical parts can be replaced DIY",
      "Consider energy efficiency when evaluating repair vs. replace"
    ]
  },
  television: {
    costRange: { min: 125, max: 450 },
    timeEstimate: "2-3 hours",
    difficulty: "Hard",
    commonIssues: [
      "No picture but has sound",
      "Power issues",
      "HDMI ports not working"
    ],
    recommendations: [
      "Modern TVs have complex circuit boards requiring specialized repair",
      "Screen replacements often cost more than a new TV",
      "Power supply issues may be repairable at reasonable cost"
    ]
  }
};

export function generateMockEstimate(productType: string): RepairEstimate {
  const normalizedType = productType.toLowerCase().trim();
  
  // Check for partial matches if no exact match
  if (!mockEstimates[normalizedType]) {
    for (const key of Object.keys(mockEstimates)) {
      if (normalizedType.includes(key) || key.includes(normalizedType)) {
        return mockEstimates[key];
      }
    }
  }
  
  // Return the exact match or default values
  return mockEstimates[normalizedType] || {
    costRange: { min: 75, max: 300 },
    timeEstimate: "2-3 hours",
    difficulty: "Moderate",
    commonIssues: ["General wear and tear", "Power issues"],
    recommendations: ["Professional assessment recommended"]
  };
}
