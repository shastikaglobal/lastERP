const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

let dir = __dirname;
let envPath;
while (dir) {
  const check = path.join(dir, '.env');
  if (fs.existsSync(check)) {
    envPath = check;
    break;
  }
  const parent = path.dirname(dir);
  if (parent === dir) break;
  dir = parent;
}
if (envPath) {
  require('dotenv').config({ path: envPath });
} else {
  require('dotenv').config();
}

const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    console.log(`[DEBUG] requireAuth: No token provided for ${req.method} ${req.url}`);
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(' ')[1];
  let user = null;
  let lastError = null;
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const { data, error } = await supabase.auth.getUser(token);
      if (error) {
        lastError = error;
        // Do not retry on definite client auth errors
        if (error.status === 400 || error.status === 401 || error.message?.includes('invalid') || error.message?.includes('expired')) {
          break;
        }
        console.warn(`[requireAuth] Attempt ${attempt}/${maxAttempts} returned error:`, error.message);
      } else if (data?.user) {
        user = data.user;
        break;
      }
    } catch (err) {
      lastError = err;
      console.warn(`[requireAuth] Attempt ${attempt}/${maxAttempts} connection failed:`, err.message);
    }

    if (attempt < maxAttempts && !user) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

  if (!user) {
    console.log(`[DEBUG] requireAuth: Token check failed for ${req.method} ${req.url}:`, lastError?.message || 'User not found');
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  req.user = { sub: user.id, ...user };
  next();
};

module.exports = { requireAuth };
