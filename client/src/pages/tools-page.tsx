import React from "react";
import { ToolList } from "@/components/tool-list";

// Define the tools data
// In a real app, this would likely come from an API or database
const phoneRepairTools = [
  {
    name: "iFixit Pro Tech Toolkit",
    description: "Professional toolkit with precision bits for repairing smartphones, tablets, and laptops",
    price: 69.99,
    imageUrl: "https://placehold.co/200x200/e2e8f0/1e293b?text=iFixit+Kit",
    amazonUrl: "https://www.amazon.com/iFixit-Pro-Tech-Toolkit-Electronics/dp/B01GF0KV6G"
  },
  {
    name: "Anti-Static Wrist Strap",
    description: "Prevents static discharge that can damage sensitive electronic components during repair",
    price: 6.99,
    imageUrl: "https://placehold.co/200x200/e2e8f0/1e293b?text=Wrist+Strap",
    amazonUrl: "https://www.amazon.com/Wristband-Bracelet-Grounding-Discharge-Prevention/dp/B08CXQN86W"
  },
  {
    name: "Phone Screen Opening Tools",
    description: "Set of plastic pry tools and suction cups for safely opening smartphone screens",
    price: 11.99,
    imageUrl: "https://placehold.co/200x200/e2e8f0/1e293b?text=Opening+Tools",
    amazonUrl: "https://www.amazon.com/Opening-Precision-Screwdriver-Non-Abrasive-Smartphones/dp/B01N4HS7QW"
  },
  {
    name: "Magnetic Screw Mat",
    description: "Keeps tiny screws organized during phone disassembly and repair",
    price: 13.95,
    imageUrl: "https://placehold.co/200x200/e2e8f0/1e293b?text=Screw+Mat",
    amazonUrl: "https://www.amazon.com/Magnetic-Project-Cellphone-Disassembly-Technicians/dp/B06Y5GVQPR"
  },
  {
    name: "Heat Gun",
    description: "Used for softening adhesive when removing screens, batteries, and other components",
    price: 22.99,
    imageUrl: "https://placehold.co/200x200/e2e8f0/1e293b?text=Heat+Gun",
    amazonUrl: "https://www.amazon.com/Wagner-Spraytech-0503008-Heat-Ultra/dp/B00004TUCV"
  }
];

// Define the laptop repair tools data
const laptopRepairTools = [
  {
    name: "Precision Screwdriver Set",
    description: "45-in-1 screwdriver set with magnetic tips for laptop, tablet, and electronics repair",
    price: 16.99,
    imageUrl: "https://placehold.co/200x200/e2e8f0/1e293b?text=Precision+Set",
    amazonUrl: "https://www.amazon.com/Precision-Screwdriver-Magnetic-Electronics-Cellphone/dp/B08PF6H7QN"
  },
  {
    name: "Spudger Tool Set",
    description: "Nylon pry tools for safely separating components without causing damage",
    price: 8.95,
    imageUrl: "https://placehold.co/200x200/e2e8f0/1e293b?text=Spudger+Tools",
    amazonUrl: "https://www.amazon.com/Plastic-Spudger-Opening-Tablets-MacBook/dp/B00KKVPZKE"
  },
  {
    name: "Anti-Static Gloves",
    description: "Prevents static discharge that can damage sensitive laptop components",
    price: 12.99,
    imageUrl: "https://placehold.co/200x200/e2e8f0/1e293b?text=ESD+Gloves",
    amazonUrl: "https://www.amazon.com/Static-Resistant-Gloves-Computer-Working/dp/B087C2K85D"
  },
  {
    name: "Thermal Paste",
    description: "High performance thermal compound for CPU and GPU cooling",
    price: 8.99,
    imageUrl: "https://placehold.co/200x200/e2e8f0/1e293b?text=Thermal+Paste",
    amazonUrl: "https://www.amazon.com/ARCTIC-MX-4-Compound-Performance-Interface/dp/B0795DP124"
  },
  {
    name: "Compressed Air Duster",
    description: "For removing dust from fans, keyboards, and hard-to-reach places",
    price: 9.99,
    imageUrl: "https://placehold.co/200x200/e2e8f0/1e293b?text=Air+Duster",
    amazonUrl: "https://www.amazon.com/Compressed-Computer-Keyboard-Electronics-Compressed-Air/dp/B07SHJZ797"
  }
];

// Define the woodworking tools data
const woodworkingTools = [
  {
    name: "DEWALT 20V MAX Cordless Drill",
    description: "Compact, lightweight design fits into tight areas with LED light ring",
    price: 99.00,
    imageUrl: "https://placehold.co/200x200/e2e8f0/1e293b?text=Cordless+Drill",
    amazonUrl: "https://www.amazon.com/DEWALT-DCD771C2-20V-Lithium-Ion-Compact/dp/B00ET5VMTU"
  },
  {
    name: "WEN Random Orbit Sander",
    description: "5-inch random orbital sander with dust collector for smooth finishing",
    price: 35.27,
    imageUrl: "https://placehold.co/200x200/e2e8f0/1e293b?text=Orbit+Sander",
    amazonUrl: "https://www.amazon.com/WEN-6301-Random-Orbital-Sander/dp/B00BD5G9VA"
  },
  {
    name: "IRWIN QUICK-GRIP Clamps",
    description: "4-pack of one-handed bar clamps for securing workpieces",
    price: 34.97,
    imageUrl: "https://placehold.co/200x200/e2e8f0/1e293b?text=Quick+Clamps",
    amazonUrl: "https://www.amazon.com/IRWIN-QUICK-GRIP-1964758-One-Handed-Special/dp/B001DSY4QO"
  },
  {
    name: "Titebond Ultimate Wood Glue",
    description: "Waterproof wood adhesive with superior bond strength",
    price: 7.47,
    imageUrl: "https://placehold.co/200x200/e2e8f0/1e293b?text=Wood+Glue",
    amazonUrl: "https://www.amazon.com/Titebond-1416-Ultimate-Glue-16-Ounce/dp/B0002YQ3KA"
  },
  {
    name: "CRAFTSMAN Circular Saw",
    description: "7-1/4-inch corded circular saw for precise, powerful cutting",
    price: 49.98,
    imageUrl: "https://placehold.co/200x200/e2e8f0/1e293b?text=Circular+Saw",
    amazonUrl: "https://www.amazon.com/CRAFTSMAN-CMES500-Circular-Laser-Guide/dp/B07TT4Q7LB"
  }
];

export default function ToolsPage() {
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