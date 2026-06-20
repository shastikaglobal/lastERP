#!/usr/bin/env node
import { getAuditLogs } from "../src/lib/auditLog";

async function run() {
  try {
    console.log("Fetching recent audit logs (limit 20)...\n");
    const logs = await getAuditLogs({ limit: 20 });
    if (!logs || logs.length === 0) {
      console.log("No audit logs found or query failed.");
      return;
    }

    logs.forEach((l) => {
      console.log(`${l.timestamp} | ${l.action} | ${l.resource_type} | user:${l.user_id} | team:${l.team || 'N/A'} | resource:${l.resource_id || l.resource_name}`);
    });
  } catch (err) {
    console.error("Verification failed:", err);
  }
}

run();
