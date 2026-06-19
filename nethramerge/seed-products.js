import fs from 'fs';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing URL or Key in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const defaultProducts = [
  { sku: "AGRI-CCN-TND", name: "Tender Coconut", category: "Coconuts", unit: "Piece", is_active: true },
  { sku: "AGRI-CCN-GRN", name: "Green Coconut", category: "Coconuts", unit: "Piece", is_active: true },
  { sku: "AGRI-CCN-HSK", name: "Husked Coconut", category: "Coconuts", unit: "Piece", is_active: true },
  { sku: "AGRI-CCN-SHK", name: "Semi-Husked Coconut", category: "Coconuts", unit: "Piece", is_active: true },
  { sku: "AGRI-CCN-DHK", name: "Dehusked Coconut", category: "Coconuts", unit: "Piece", is_active: true },
  { sku: "AGRI-CCN-ORG", name: "Fresh Organic Coconut", category: "Coconuts", unit: "Piece", is_active: true },
  { sku: "AGRI-TOM-001", name: "Tomato", category: "Vegetables", unit: "Ton", is_active: true },
  { sku: "AGRI-WML-REG", name: "Watermelon", category: "Fruits", unit: "Ton", is_active: true },
  { sku: "AGRI-WML-BLK", name: "Black Diamond Watermelon", category: "Fruits", unit: "Ton", is_active: true },
  { sku: "AGRI-PMK-YEL", name: "Yellow Pumpkin", category: "Vegetables", unit: "Ton", is_active: true },
  { sku: "AGRI-PMK-WHT", name: "White Pumpkin", category: "Vegetables", unit: "Ton", is_active: true },
  { sku: "AGRI-CUC-YEL", name: "Yellow Cucumber", category: "Vegetables", unit: "Ton", is_active: true },
  { sku: "AGRI-BAN-CAV", name: "Cavendish Banana", category: "Bananas", unit: "Ton", is_active: true },
  { sku: "AGRI-BAN-BBY", name: "Baby Banana", category: "Bananas", unit: "Ton", is_active: true },
  { sku: "AGRI-BAN-NEN", name: "Nendran Banana", category: "Bananas", unit: "Ton", is_active: true },
  { sku: "AGRI-BAN-RED", name: "Red Banana", category: "Bananas", unit: "Ton", is_active: true },
];

async function seed() {
  console.log("Seeding to:", SUPABASE_URL);

  const { data: existing, error: err } = await supabase.from('products').select('*');
  if (err) {
    console.error("Checking existing failed", err);
  }

  for (const p of defaultProducts) {
    if (existing && existing.find(e => e.name === p.name || e.sku === p.sku)) {
      console.log("Skipping", p.name, "(already exists)");
      continue;
    }
    const { data, error } = await supabase.from('products').insert([p]);
    if (error) {
      console.error("Error inserting", p.name, error.message);
    } else {
      console.log("Inserted", p.name);
    }
  }
}

seed();
