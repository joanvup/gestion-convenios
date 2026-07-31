import fs from 'node:fs';
import path from 'node:path';

const versionFilePath = path.resolve('src/version.ts');
const packageJsonPath = path.resolve('package.json');

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

// Update src/version.ts
const versionTsContent = `export const APP_VERSION = "${currentVersion}";\n`;
fs.writeFileSync(versionFilePath, versionTsContent, 'utf-8');

// Update package.json
if (fs.existsSync(packageJsonPath)) {
  const pkgContent = fs.readFileSync(packageJsonPath, 'utf-8');
  const pkg = JSON.parse(pkgContent);
  pkg.version = currentVersion;
  fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
}

console.log(`[Version Bump] Incremented app version to v${currentVersion}`);
