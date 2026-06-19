import fetch from 'node-fetch';

async function testFetch() {
  console.log("Testing node-fetch...");
  try {
    const res = await fetch("https://sxebygxpjzntogzpjnga.supabase.co/rest/v1/");
    console.log(`node-fetch status: ${res.status}`);
  } catch (err) {
    console.error("node-fetch failed:", err.message);
  }

  console.log("\nTesting global fetch (undici)...");
  try {
    const res = await globalThis.fetch("https://sxebygxpjzntogzpjnga.supabase.co/rest/v1/");
    console.log(`global fetch status: ${res.status}`);
  } catch (err) {
    console.error("global fetch failed:", err.message);
  }
}

testFetch();
