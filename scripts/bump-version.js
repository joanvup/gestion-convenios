import fs from 'node:fs';
import path from 'node:path';

const versionFilePath = path.resolve('src/version.ts');
const packageJsonPath = path.resolve('package.json');
const publicDirPath = path.resolve('public');
const versionJsonPath = path.resolve('public/version.json');

let currentVersion = '1.0.0';

if (fs.existsSync(versionFilePath)) {
  const content = fs.readFileSync(versionFilePath, 'utf-8');
  const match = content.match(/APP_VERSION\s*=\s*["']([^"']+)["']/);
  if (match) {
    currentVersion = match[1];
  }
} else if (fs.existsSync(packageJsonPath)) {
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  if (pkg.version) {
    currentVersion = pkg.version;
  }
}

const parts = currentVersion.split('.').map((p) => parseInt(p, 10));

if (parts.length === 3 && !parts.some(isNaN)) {
  parts[2] += 1;
  currentVersion = parts.join('.');
} else if (parts.length === 2 && !parts.some(isNaN)) {
  parts[1] += 1;
  currentVersion = parts.join('.');
} else {
  currentVersion = '1.0.1';
}

// Update src/version.ts with APP_VERSION constant and fetchAppVersion function
const versionTsContent = `export const APP_VERSION = "${currentVersion}";

/**
 * Utility to fetch the current app version from static version.json or API, falling back to APP_VERSION
 */
export async function fetchAppVersion(): Promise<string> {
  try {
    const res = await fetch('/version.json?t=' + Date.now());
    if (res.ok) {
      const data = await res.json();
      if (data && data.version) {
        return data.version;
      }
    }
  } catch {
    // Fall back to API
  }

  try {
    const res = await fetch('/api/system/version');
    if (res.ok) {
      const data = await res.json();
      if (data && data.version) {
        return data.version;
      }
    }
  } catch {
    // Fall back to APP_VERSION
  }

  return APP_VERSION;
}
`;
fs.writeFileSync(versionFilePath, versionTsContent, 'utf-8');

// Update package.json
if (fs.existsSync(packageJsonPath)) {
  const pkgContent = fs.readFileSync(packageJsonPath, 'utf-8');
  const pkg = JSON.parse(pkgContent);
  pkg.version = currentVersion;
  fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
}

// Ensure public directory exists and write public/version.json
if (!fs.existsSync(publicDirPath)) {
  fs.mkdirSync(publicDirPath, { recursive: true });
}

const versionJsonData = {
  version: currentVersion,
  updatedAt: new Date().toISOString()
};

fs.writeFileSync(versionJsonPath, JSON.stringify(versionJsonData, null, 2) + '\n', 'utf-8');

console.log(`[Version Bump] Incremented app version to v${currentVersion} and saved public/version.json`);

