import fs from 'fs';
import path from 'path';

const files = [
  'src/pages/quotations/PublicQuotationView.tsx',
  'src/pages/employees/EmployeeDirectory.tsx',
  'src/pages/documents/InvoicePreview.tsx',
  'src/pages/documents/PackingLists.tsx',
  'src/lib/packing-service.ts'
];

for (const file of files) {
  const filePath = path.resolve(file);
  if (fs.existsSync(filePath)) {
    console.log(`Patching ${file}...`);
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('localhost:8082')) {
      content = content.replaceAll('localhost:8082', '127.0.0.1:8082');
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Patched ${file}`);
    } else {
      console.log(`ℹ️ No localhost:8082 found in ${file}`);
    }
  } else {
    console.warn(`⚠️ File not found: ${file}`);
  }
}
