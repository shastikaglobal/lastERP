# -*- coding: utf-8 -*-
import os
import re

files_to_update = [
    'src/pages/inventory/AvailableStock.tsx',
    'src/pages/inventory/BatchWiseStock.tsx',
    'src/pages/inventory/ExportReady.tsx',
    'src/pages/inventory/InventoryBatches.tsx',
    'src/pages/inventory/ReservedStock.tsx',
    'src/pages/inventory/StockDashboard.tsx',
    'src/pages/reports/ExportReadyStockReport.tsx',
    'src/pages/reports/StockSummaryReport.tsx',
    'src/pages/warehouse/ReceivingGoods.tsx'
]

for filepath in files_to_update:
    path = os.path.join('d:/swanethkaruerp/nethramerge', filepath)
    if not os.path.exists(path):
        continue
    
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Pattern 1: {warehouse.name}
    content = re.sub(
        r'\{warehouse\.name\}',
        r'{warehouse.name} - {[warehouse.location, warehouse.city].filter(Boolean).join(", ")}',
        content
    )

    # Pattern 2: {w.name} followed by old location logic
    content = re.sub(
        r'\{w\.name\}(?:\{w\.location\s*\?\s*.+?\s*:\s*\'\'\})?',
        r'{w.name} - {[w.location, w.city].filter(Boolean).join(", ")}',
        content
    )

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

print('Done replacing in files!')
