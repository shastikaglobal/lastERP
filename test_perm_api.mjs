import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

async function testApi() {
  try {
    const res = await fetch('http://127.0.0.1:8082/api/permissions', {
      headers: {
         // I might need an auth token if requireAuth is strict
         'Authorization': `Bearer fake_token`
      }
    });
    console.log(res.status);
    const text = await res.text();
    console.log(text);
  } catch (err) {
    console.error(err);
  }
}

testApi();
