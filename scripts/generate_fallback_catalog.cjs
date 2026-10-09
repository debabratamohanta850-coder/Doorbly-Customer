const fs = require('fs');
const path = require('path');

const masterSqlPath = path.resolve(__dirname, '../doorbly_service_master.sql');
const content = fs.readFileSync(masterSqlPath, 'utf-8');

// Categories regex
const catRegex = /\(\s*'([^']+)'\s*,\s*'([^']+)'\s*\)/g;
const catSection = content.split('-- 3. CATEGORIES')[1]?.split('-- 4. HELPER FUNCTION')[0] || '';
const categories = [];
let cMatch;
while ((cMatch = catRegex.exec(catSection)) !== null) {
  categories.push({
    category_name: cMatch[1],
    description: cMatch[2]
  });
}

// Service regex matching multi-line select public.doorbly_add_service(...)
const srvRegex = /select\s+public\.doorbly_add_service\s*\(\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*([0-9.]+)\s*,\s*'([^']+)'\s*\);/gs;
const services = [];
let sMatch;
let idCounter = 1;

while ((sMatch = srvRegex.exec(content)) !== null) {
  const categoryName = sMatch[1];
  const subcategory = sMatch[2];
  const serviceName = sMatch[3];
  const description = sMatch[4];
  const providerRate = parseFloat(sMatch[5]) || 300;
  const skillLevel = sMatch[6];
  const doorblyCharge = Math.round(providerRate * 0.2);
  const customerPrice = providerRate + doorblyCharge;

  const catUpper = categoryName.toUpperCase();
  let categoryType = 'DOORSTEP';
  if (
    catUpper.includes('FREELANCE') ||
    catUpper.includes('DIGITAL') ||
    catUpper.includes('GRAPHIC') ||
    catUpper.includes('WEBSITE') ||
    catUpper.includes('SOFTWARE') ||
    catUpper.includes('PHOTOGRAPHY') ||
    catUpper.includes('EDUCATION') ||
    catUpper.includes('TRAINING')
  ) {
    categoryType = 'FREELANCE';
  } else if (
    catUpper.includes('CORP') ||
    catUpper.includes('BUSINESS') ||
    catUpper.includes('LEGAL') ||
    catUpper.includes('FINANCIAL') ||
    catUpper.includes('SECURITY') ||
    catUpper.includes('FACILITY') ||
    catUpper.includes('LOGISTICS') ||
    catUpper.includes('REAL ESTATE')
  ) {
    categoryType = 'CORPORATE';
  }

  services.push({
    id: `srv_std_${idCounter++}`,
    category_name: categoryName,
    category_code: categoryName,
    category_type: categoryType,
    subcategory,
    service_name: serviceName,
    description,
    provider_hourly_rate: providerRate,
    doorbly_charge: doorblyCharge,
    customer_hourly_price: customerPrice,
    price: customerPrice,
    unit: 'hour',
    pricing_unit: 'per hour',
    skill_level: skillLevel,
    active: true,
    image: null
  });
}

const outContent = `// Pre-bundled official Doorbly service catalog (150+ standardized services across 23 categories)
// Ensures instant availability, offline robustness, and seamless fallback if remote database is paused.

import { CatalogService, ServiceCategory } from '../types/supabase';

export const FALLBACK_CATEGORIES: ServiceCategory[] = ${JSON.stringify(
  categories.map((c, i) => {
    const catUpper = c.category_name.toUpperCase();
    let categoryType = 'DOORSTEP';
    if (
      catUpper.includes('FREELANCE') ||
      catUpper.includes('DIGITAL') ||
      catUpper.includes('GRAPHIC') ||
      catUpper.includes('WEBSITE') ||
      catUpper.includes('SOFTWARE') ||
      catUpper.includes('PHOTOGRAPHY') ||
      catUpper.includes('EDUCATION') ||
      catUpper.includes('TRAINING')
    ) {
      categoryType = 'FREELANCE';
    } else if (
      catUpper.includes('CORP') ||
      catUpper.includes('BUSINESS') ||
      catUpper.includes('LEGAL') ||
      catUpper.includes('FINANCIAL') ||
      catUpper.includes('SECURITY') ||
      catUpper.includes('FACILITY') ||
      catUpper.includes('LOGISTICS') ||
      catUpper.includes('REAL ESTATE')
    ) {
      categoryType = 'CORPORATE';
    }

    return {
      id: `cat_std_${i + 1}`,
      category_name: c.category_name,
      category_code: c.category_name,
      category_type: categoryType,
      description: c.description,
      sort_order: i + 1,
      active: true,
      image: null
    };
  }),
  null,
  2
)};

export const FALLBACK_SERVICES: CatalogService[] = ${JSON.stringify(services, null, 2)};
`;

fs.writeFileSync(path.resolve(__dirname, '../src/data/fallbackCatalog.ts'), outContent);
console.log(`SUCCESS: Generated ${categories.length} categories and ${services.length} services in fallbackCatalog.ts`);
