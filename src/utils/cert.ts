// import { readFileSync } from "node:fs";
// import path from "node:path";

// export const PRIVATE_KEY = readFileSync(path.resolve("cert/private-key.pem"));
// export const PUBLIC_KEY = readFileSync(path.resolve("cert/public-key.pub"));

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

function loadCertificate(filePath: string, envVarName: string): Buffer {
  const resolvedPath = path.resolve(filePath);
  
  if (existsSync(resolvedPath)) {
    // Local Dev: Read from your physical files
    return readFileSync(resolvedPath);
  } else if (process.env[envVarName]) {
    // Production (Render): Read from Render's Environment Variables
    const formattedKey = process.env[envVarName].replace(/\\n/g, '\n');
    return Buffer.from(formattedKey, 'utf-8');
  } else {
    throw new Error(`Missing Certificate: Cannot find ${filePath} or ENV: ${envVarName}`);
  }
}

export const PRIVATE_KEY = loadCertificate("cert/private-key.pem", "PRIVATE_KEY_CONTENT");
export const PUBLIC_KEY = loadCertificate("cert/public-key.pub", "PUBLIC_KEY_CONTENT");