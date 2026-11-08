#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const check = args.includes("--check");
const requested = args.find((arg) => arg !== "--check");
const versionFile = path.join(root, "VERSION");
const version = (requested ?? fs.readFileSync(versionFile, "utf8")).trim().replace(/^v/, "");

if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(version)) {
  throw new Error(`Invalid semantic version: ${version}`);
}

const changes = [];

function update(relativePath, transform) {
  const filename = path.join(root, relativePath);
  const before = fs.readFileSync(filename, "utf8");
  const after = transform(before);
  if (before === after) return;
  changes.push(relativePath);
  if (!check) fs.writeFileSync(filename, after);
}

function replace(source, pattern, replacement, relativePath) {
  if (!pattern.test(source)) {
    throw new Error(`Cannot find version field in ${relativePath}`);
  }
  pattern.lastIndex = 0;
  return source.replace(pattern, replacement);
}

function updateJSON(relativePath, transform) {
  update(relativePath, (source) => {
    const value = JSON.parse(source);
    transform(value);
    return `${JSON.stringify(value, null, 2)}\n`;
  });
}

if (requested) {
  update("VERSION", () => `${version}\n`);
}

updateJSON("desktop/frontend/package.json", (value) => {
  value.version = version;
});
updateJSON("desktop/frontend/package-lock.json", (value) => {
  value.version = version;
  value.packages[""].version = version;
});
const textFiles = [
  [
    "internal/version/version.go",
    /const Current = "[^"]+"/,
    `const Current = "${version}"`,
  ],
  [
    "desktop/frontend/src/version.ts",
    /export const APP_VERSION = "[^"]+";/,
    `export const APP_VERSION = "${version}";`,
  ],
  [
    "desktop/build/config.yml",
    /(^  version: ")[^"]+("$)/m,
    `$1${version}$2`,
  ],
  [
    "desktop/build/windows/info.json",
    /("file_version": ")[^"]+("[\s\S]*?"ProductVersion": ")[^"]+("[,\n])/,
    `$1${version}$2${version}$3`,
  ],
  [
    "desktop/build/windows/wails.exe.manifest",
    /(assemblyIdentity type="win32" name="com\.lahiruudayakumara\.devnode" version=")[^"]+(" process)/,
    `$1${version}.0$2`,
  ],
  [
    "desktop/build/windows/msix/template.xml",
    /(<PackageInformation[\s\S]*?\bVersion=")[^"]+("[\s\S]*?PackageDescription=)/,
    `$1${version}.0$2`,
  ],
  [
    "desktop/build/windows/msix/app_manifest.xml",
    /(<Identity[\s\S]*?\bVersion=")[^"]+("[\s\S]*?ProcessorArchitecture)/,
    `$1${version}.0$2`,
  ],
  [
    "desktop/build/windows/nsis/wails_tools.nsh",
    /(!define INFO_PRODUCTVERSION ")[^"]+("\n)/,
    `$1${version}$2`,
  ],
  [
    "desktop/build/linux/nfpm/nfpm.yaml",
    /(^version: ")[^"]+("$)/m,
    `$1${version}$2`,
  ],
];

for (const [relativePath, pattern, replacement] of textFiles) {
  update(relativePath, (source) => replace(source, pattern, replacement, relativePath));
}

for (const relativePath of [
  "desktop/build/darwin/Info.plist",
  "desktop/build/darwin/Info.dev.plist",
]) {
  update(relativePath, (source) => {
    let result = source;
    for (const key of ["CFBundleShortVersionString", "CFBundleVersion"]) {
      const pattern = new RegExp(`(<key>${key}</key>\\s*<string>)[^<]+(</string>)`);
      result = replace(result, pattern, `$1${version}$2`, relativePath);
    }
    return result;
  });
}

if (check && changes.length > 0) {
  console.error(`Version ${version} is not synchronized in:\n${changes.map((file) => `- ${file}`).join("\n")}`);
  process.exit(1);
}

console.log(
  changes.length === 0
    ? `Version ${version} is already synchronized.`
    : `${check ? "Found" : "Updated"} ${changes.length} file(s) for version ${version}.`,
);
