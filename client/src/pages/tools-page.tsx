import React, { useEffect, useState } from "react";
import { ToolList } from "@/components/tool-list";
import { useLocation } from "wouter";

// Define the tools data
// In a real app, this would likely come from an API or database
const phoneRepairTools = [
  {
    name: "iFixit Pro Tech Toolkit",
    description: "Professional toolkit with precision bits for repairing smartphones, tablets, and laptops",
    price: 69.99,
    imageUrl: "https://placehold.co/200x200/e2e8f0/1e293b?text=iFixit+Kit",
    amazonUrl: "https://www.amazon.com/iFixit-Pro-Tech-Toolkit-Electronics/dp/B01GF0KV6G?tag=youraffiliateID-20"
  },
  {
    name: "Anti-Static Wrist Strap",
    description: "Prevents static discharge that can damage sensitive electronic components during repair",
    price: 6.99,
    imageUrl: "https://placehold.co/200x200/e2e8f0/1e293b?text=Wrist+Strap",
    amazonUrl: "https://www.amazon.com/Wristband-Bracelet-Grounding-Discharge-Prevention/dp/B08CXQN86W?tag=youraffiliateID-20"
  },
  {
    name: "Phone Screen Opening Tools",
    description: "Set of plastic pry tools and suction cups for safely opening smartphone screens",
    price: 11.99,
    imageUrl: "https://placehold.co/200x200/e2e8f0/1e293b?text=Opening+Tools",
    amazonUrl: "https://www.amazon.com/Opening-Precision-Screwdriver-Non-Abrasive-Smartphones/dp/B01N4HS7QW?tag=youraffiliateID-20"
  },
  {
    name: "Magnetic Screw Mat",
    description: "Keeps tiny screws organized during phone disassembly and repair",
    price: 13.95,
    imageUrl: "https://placehold.co/200x200/e2e8f0/1e293b?text=Screw+Mat",
    amazonUrl: "https://www.amazon.com/Magnetic-Project-Cellphone-Disassembly-Technicians/dp/B06Y5GVQPR?tag=youraffiliateID-20"
  },
  {
    name: "Heat Gun",
    description: "Used for softening adhesive when removing screens, batteries, and other components",
    price: 22.99,
    imageUrl: "https://placehold.co/200x200/e2e8f0/1e293b?text=Heat+Gun",
    amazonUrl: "https://www.amazon.com/Wagner-Spraytech-0503008-Heat-Ultra/dp/B00004TUCV?tag=youraffiliateID-20"
  }
];

// Define the laptop repair tools data
const laptopRepairTools = [
  {
    name: "Precision Screwdriver Set",
    description: "45-in-1 screwdriver set with magnetic tips for laptop, tablet, and electronics repair",
    price: 16.99,
    imageUrl: "https://placehold.co/200x200/e2e8f0/1e293b?text=Precision+Set",
    amazonUrl: "https://www.amazon.com/Precision-Screwdriver-Magnetic-Electronics-Cellphone/dp/B08PF6H7QN?tag=youraffiliateID-20"
  },
  {
    name: "Spudger Tool Set",
    description: "Nylon pry tools for safely separating components without causing damage",
    price: 8.95,
    imageUrl: "https://placehold.co/200x200/e2e8f0/1e293b?text=Spudger+Tools",
    amazonUrl: "https://www.amazon.com/Plastic-Spudger-Opening-Tablets-MacBook/dp/B00KKVPZKE?tag=youraffiliateID-20"
  },
  {
    name: "Anti-Static Gloves",
    description: "Prevents static discharge that can damage sensitive laptop components",
    price: 12.99,
    imageUrl: "https://placehold.co/200x200/e2e8f0/1e293b?text=ESD+Gloves",
    amazonUrl: "https://www.amazon.com/Static-Resistant-Gloves-Computer-Working/dp/B087C2K85D?tag=youraffiliateID-20"
  },
  {
    name: "Thermal Paste",
    description: "High performance thermal compound for CPU and GPU cooling",
    price: 8.99,
    imageUrl: "https://placehold.co/200x200/e2e8f0/1e293b?text=Thermal+Paste",
    amazonUrl: "https://www.amazon.com/ARCTIC-MX-4-Compound-Performance-Interface/dp/B0795DP124?tag=youraffiliateID-20"
  },
  {
    name: "Compressed Air Duster",
    description: "For removing dust from fans, keyboards, and hard-to-reach places",
    price: 9.99,
    imageUrl: "https://placehold.co/200x200/e2e8f0/1e293b?text=Air+Duster",
    amazonUrl: "https://www.amazon.com/Compressed-Computer-Keyboard-Electronics-Compressed-Air/dp/B07SHJZ797?tag=youraffiliateID-20"
  }
];

// Define the woodworking tools data
const woodworkingTools = [
  {
    name: "DEWALT 20V MAX Cordless Drill",
    description: "Compact, lightweight design fits into tight areas with LED light ring",
    price: 99.00,
    imageUrl: "https://placehold.co/200x200/e2e8f0/1e293b?text=Cordless+Drill",
    amazonUrl: "https://www.amazon.com/DEWALT-DCD771C2-20V-Lithium-Ion-Compact/dp/B00ET5VMTU?tag=youraffiliateID-20"
  },
  {
    name: "WEN Random Orbit Sander",
    description: "5-inch random orbital sander with dust collector for smooth finishing",
    price: 35.27,
    imageUrl: "https://placehold.co/200x200/e2e8f0/1e293b?text=Orbit+Sander",
    amazonUrl: "https://www.amazon.com/WEN-6301-Random-Orbital-Sander/dp/B00BD5G9VA?tag=youraffiliateID-20"
  },
  {
    name: "IRWIN QUICK-GRIP Clamps",
    description: "4-pack of one-handed bar clamps for securing workpieces",
    price: 34.97,
    imageUrl: "https://placehold.co/200x200/e2e8f0/1e293b?text=Quick+Clamps",
    amazonUrl: "https://www.amazon.com/IRWIN-QUICK-GRIP-1964758-One-Handed-Special/dp/B001DSY4QO?tag=youraffiliateID-20"
  },
  {
    name: "Titebond Ultimate Wood Glue",
    description: "Waterproof wood adhesive with superior bond strength",
    price: 7.47,
    imageUrl: "https://placehold.co/200x200/e2e8f0/1e293b?text=Wood+Glue",
    amazonUrl: "https://www.amazon.com/Titebond-1416-Ultimate-Glue-16-Ounce/dp/B0002YQ3KA?tag=youraffiliateID-20"
  },
  {
    name: "CRAFTSMAN Circular Saw",
    description: "7-1/4-inch corded circular saw for precise, powerful cutting",
    price: 49.98,
    imageUrl: "https://placehold.co/200x200/e2e8f0/1e293b?text=Circular+Saw",
    amazonUrl: "https://www.amazon.com/CRAFTSMAN-CMES500-Circular-Laser-Guide/dp/B07TT4Q7LB?tag=youraffiliateID-20"
  }
];

interface Tool {
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  amazonUrl: string;
}

// Helper function to find recommended tools based on names
function findRecommendedTools(toolNames: string[]): Tool[] {
  // Create an array with all available tools
  const allTools = [...phoneRepairTools, ...laptopRepairTools, ...woodworkingTools];
  
  // Map of generic tool names to specific product recommendations
  const toolMapping = {
    // Phone/Electronics tools
    "screwdriver set": phoneRepairTools[0], // iFixit Pro Tech Toolkit
    "precision screwdriver": phoneRepairTools[0], // iFixit Pro Tech Toolkit
    "anti-static wrist strap": phoneRepairTools[1],
    "pry tools": phoneRepairTools[2], // Phone Screen Opening Tools
    "opening tools": phoneRepairTools[2],
    "screw mat": phoneRepairTools[3], // Magnetic Screw Mat
    "magnetic mat": phoneRepairTools[3],
    "heat gun": phoneRepairTools[4],
    
    // Laptop tools
    "precision screwdriver set": laptopRepairTools[0],
    "spudger": laptopRepairTools[1], // Spudger Tool Set
    "spudger tool": laptopRepairTools[1],
    "anti-static gloves": laptopRepairTools[2],
    "thermal paste": laptopRepairTools[3],
    "compressed air": laptopRepairTools[4],
    "air duster": laptopRepairTools[4],
    
    // Woodworking tools
    "drill": woodworkingTools[0], // DEWALT Cordless Drill
    "cordless drill": woodworkingTools[0],
    "sander": woodworkingTools[1], // WEN Random Orbit Sander
    "clamps": woodworkingTools[2], // IRWIN QUICK-GRIP Clamps
    "wood glue": woodworkingTools[3], // Titebond Ultimate Wood Glue
    "circular saw": woodworkingTools[4], // CRAFTSMAN Circular Saw
    
    // Common tools
    "socket set": {
      name: "DEWALT Socket Set",
      description: "40-piece socket set with ratchet, perfect for car and home repairs",
      price: 24.97,
      imageUrl: "https://placehold.co/200x200/e2e8f0/1e293b?text=Socket+Set",
      amazonUrl: "https://www.amazon.com/DEWALT-Socket-Set-SAE-Piece/dp/B000GTSOYM?tag=youraffiliateID-20"
    },
    "pliers": {
      name: "IRWIN VISE-GRIP Pliers Set",
      description: "3-piece pliers set including needle nose, diagonal, and slip joint pliers",
      price: 19.98,
      imageUrl: "https://placehold.co/200x200/e2e8f0/1e293b?text=Pliers+Set",
      amazonUrl: "https://www.amazon.com/Tools-VISE-GRIP-Original-3-Piece-2078705/dp/B07MDLT6SK?tag=youraffiliateID-20"
    },
    "car jack": {
      name: "Torin Big Red Hydraulic Floor Jack",
      description: "3 ton capacity steel floor jack for vehicle maintenance",
      price: 44.99,
      imageUrl: "https://placehold.co/200x200/e2e8f0/1e293b?text=Floor+Jack",
      amazonUrl: "https://www.amazon.com/Torin-Hydraulic-Trolley-Floor-Capacity/dp/B0028JQYVE?tag=youraffiliateID-20"
    },
    "wrench": {
      name: "TEKTON Wrench Set",
      description: "30-piece combination wrench set with storage pouch",
      price: 52.99,
      imageUrl: "https://placehold.co/200x200/e2e8f0/1e293b?text=Wrench+Set",
      amazonUrl: "https://www.amazon.com/TEKTON-Combination-Wrench-30-Piece-WRN53190/dp/B00I5THC4C?tag=youraffiliateID-20"
    },
    "screwdriver": {
      name: "CRAFTSMAN Screwdriver Set",
      description: "12-piece set with various sizes and types for all-purpose repairs",
      price: 39.97,
      imageUrl: "https://placehold.co/200x200/e2e8f0/1e293b?text=Screwdriver+Set",
      amazonUrl: "https://www.amazon.com/CRAFTSMAN-Screwdriver-Slotted-Cushion-CMHT65048/dp/B07ZYTBKYS?tag=youraffiliateID-20"
    }
  };

  // Convert tool names to lowercase for case-insensitive matching
  const lowerCaseToolNames = toolNames.map((name: string) => name.toLowerCase());
  
  // Find matching tools from our mapping
  const recommendedTools: Tool[] = [];
  
  lowerCaseToolNames.forEach((toolName: string) => {
    // First check for exact matches
    for (const [key, tool] of Object.entries(toolMapping)) {
      if (toolName === key || toolName.includes(key)) {
        if (!recommendedTools.some(t => t.name === tool.name)) {
          recommendedTools.push(tool);
        }
        return;
      }
    }
    
    // If no exact match, look for partial matches
    for (const [key, tool] of Object.entries(toolMapping)) {
      if (toolName.includes(key) || key.includes(toolName)) {
        if (!recommendedTools.some(t => t.name === tool.name)) {
          recommendedTools.push(tool);
        }
        return;
      }
    }
    
    // If no match found for this tool name, add a generic recommendation
    const hasMatch = Object.entries(toolMapping).some(([key, _]) => 
      toolName === key || toolName.includes(key) || key.includes(toolName)
    );
    
    if (!hasMatch) {
      recommendedTools.push({
        name: toolName,
        description: `Essential tool for your repair project`,
        price: 19.99,
        imageUrl: `https://placehold.co/200x200/e2e8f0/1e293b?text=${encodeURIComponent(toolName)}`,
        amazonUrl: `https://www.amazon.com/s?k=${encodeURIComponent(toolName)}&tag=youraffiliateID-20`
      });
    }
  });
  
  return recommendedTools;
}

export default function ToolsPage() {
  const [location] = useLocation();
  const [requiredTools, setRequiredTools] = useState<Tool[]>([]);
  const [toolNames, setToolNames] = useState<string[]>([]);
  
  useEffect(() => {
    // Parse the URL to get the tools parameter
    const params = new URLSearchParams(window.location.search);
    const toolsParam = params.get('tools');
    
    if (toolsParam) {
      // Split the comma-separated list of tools
      const toolList = decodeURIComponent(toolsParam).split(',');
      setToolNames(toolList);
      
      // Find recommended tools based on the names
      const recommended = findRecommendedTools(toolList);
      setRequiredTools(recommended);
    }
  }, [location]);
  
  // If no specific tools were requested, show all categories
  if (toolNames.length === 0) {
    return (
      <div className="container mx-auto py-8 space-y-12">
        <div>
          <h1 className="text-4xl font-bold mb-6">Essential Tools by Category</h1>
          <p className="text-lg text-muted-foreground mb-8">
            Find the right tools for your specific project, each with direct links to Amazon.
          </p>
        </div>
        
        <section>
          <h2 className="text-2xl font-semibold mb-4">Phone Repair Tools</h2>
          <ToolList taskType="Phone Repair" tools={phoneRepairTools} />
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Laptop Repair Tools</h2>
          <ToolList taskType="Laptop Repair" tools={laptopRepairTools} />
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Woodworking Tools</h2>
          <ToolList taskType="Woodworking" tools={woodworkingTools} />
        </section>
      </div>
    );
  }
  
  // Show only the required tools for the specific repair
  return (
    <div className="container mx-auto py-8 space-y-12">
      <div>
        <h1 className="text-4xl font-bold mb-6">Required Tools for Your Repair</h1>
        <p className="text-lg text-muted-foreground mb-8">
          Here are the specific tools recommended for your repair project.
        </p>
      </div>
      
      <section>
        <h2 className="text-2xl font-semibold mb-4">Recommended Tools</h2>
        <ToolList taskType="Your Repair" tools={requiredTools} />
      </section>
      
      <div className="mt-8 p-4 border rounded-lg bg-muted/50">
        <h3 className="text-lg font-medium mb-2">Tools needed for your repair:</h3>
        <ul className="list-disc list-inside space-y-1">
          {toolNames.map((tool, index) => (
            <li key={index} className="text-sm text-muted-foreground">{tool}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}