#!/bin/bash

# Updates URLs in the repair-tools-shopping.tsx file

sed -i -E "s@{ platform: \"Amazon\", price: [0-9]+\.[0-9]+, url: \"https://amazon.com/example\"@{ platform: \"Amazon\", price: \\1, url: \"https://www.amazon.com/s?k=\\2\"@g" client/src/components/repair-tools-shopping.tsx

sed -i -E "s@{ platform: \"Home Depot\", price: [0-9]+\.[0-9]+, url: \"https://homedepot.com/example\"@{ platform: \"Home Depot\", price: \\1, url: \"https://www.homedepot.com/b/Tools-Hand-Tools/N-5yc1vZc1xy\"@g" client/src/components/repair-tools-shopping.tsx

sed -i -E "s@{ platform: \"Walmart\", price: [0-9]+\.[0-9]+, url: \"https://walmart.com/example\"@{ platform: \"Walmart\", price: \\1, url: \"https://www.walmart.com/browse/tools/1031899\"@g" client/src/components/repair-tools-shopping.tsx

sed -i -E "s@{ platform: \"eBay\", price: [0-9]+\.[0-9]+, url: \"https://ebay.com/example\"@{ platform: \"eBay\", price: \\1, url: \"https://www.ebay.com/b/Home-Tools/bn_7000259846\"@g" client/src/components/repair-tools-shopping.tsx

sed -i -E "s@{ platform: \"Lowe's\", price: [0-9]+\.[0-9]+, url: \"https://lowes.com/example\"@{ platform: \"Lowe's\", price: \\1, url: \"https://www.lowes.com/c/Tools-hardware/Tools\"@g" client/src/components/repair-tools-shopping.tsx

sed -i -E "s@{ platform: \"Best Buy\", price: [0-9]+\.[0-9]+, url: \"https://bestbuy.com/example\"@{ platform: \"Best Buy\", price: \\1, url: \"https://www.bestbuy.com/site/tools-hardware\"@g" client/src/components/repair-tools-shopping.tsx

sed -i -E "s@{ platform: \"Michaels\", price: [0-9]+\.[0-9]+, url: \"https://michaels.com/example\"@{ platform: \"Michaels\", price: \\1, url: \"https://www.michaels.com/shop/crafts-and-hobbies/crafting-tools\"@g" client/src/components/repair-tools-shopping.tsx

sed -i -E "s@{ platform: \"Harbor Freight\", price: [0-9]+\.[0-9]+, url: \"https://harborfreight.com/example\"@{ platform: \"Harbor Freight\", price: \\1, url: \"https://www.harborfreight.com/hand-tools\"@g" client/src/components/repair-tools-shopping.tsx

# Update "see all tools" button at bottom
sed -i -E 's@href=\{`https://www.amazon.com/s\?k=\${encodeURIComponent\(.*\)}\`@href=\{`https://www.google.com/search?tbm=shop&q=\${encodeURIComponent(tools.join(" "))}` \}@g' client/src/components/repair-tools-shopping.tsx

# Now let's also update the "Read Reviews" links
sed -i -E 's@href=\{`https://www.google.com/search\?q=\${encodeURIComponent\(tool.name \+ " reviews"\)}`\}@href=\{`https://www.google.com/search?q=\${encodeURIComponent(tool.name + " reviews")}`\}@g' client/src/components/repair-tools-shopping.tsx

