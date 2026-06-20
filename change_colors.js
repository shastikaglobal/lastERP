import fs from 'fs';
const files = [
  'd:\\ERP\\shastika ERP\\src\\components\\quotations\\QuotationDocument.tsx',
  'd:\\ERP1\\ERP\\src\\components\\quotations\\QuotationDocument.tsx'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace grey text colors
    content = content.replace(/color:\s*['"]#333['"]/g, 'color: "#000"');
    content = content.replace(/color:\s*['"]#444['"]/g, 'color: "#000"');
    content = content.replace(/color:\s*['"]#ccc['"]/g, 'color: "#000"');
    
    // Replace grey borders
    content = content.replace(/#b0b0b0/g, '#000');
    content = content.replace(/#e0e0e0/g, '#000');
    content = content.replace(/#aaa/g, '#000');
    content = content.replace(/#888/g, '#000');
    content = content.replace(/#e8e8e8/g, '#000');
    content = content.replace(/#d0d0d0/g, '#000');

    fs.writeFileSync(file, content);
    console.log('Updated ' + file);
  }
});
