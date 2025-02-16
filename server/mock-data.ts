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
  }
};

export function generateMockEstimate(productType: string): RepairEstimate {
  return mockEstimates[productType.toLowerCase()] || {
    costRange: { min: 75, max: 300 },
    timeEstimate: "2-3 hours",
    difficulty: "Moderate",
    commonIssues: ["General wear and tear", "Power issues"],
    recommendations: ["Professional assessment recommended"]
  };
}
