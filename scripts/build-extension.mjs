import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const supportedBrowsers = new Set(['chrome', 'firefox', 'safari']);

function parseBrowserArgument() {
  const [, , rawArg] = process.argv;
  if (!rawArg) {
    return 'chrome';
  }

  const normalized = rawArg.replace(/^--browser=/, '').toLowerCase();
  if (!supportedBrowsers.has(normalized)) {
    throw new Error(`Unsupported browser "${normalized}". Use one of: ${Array.from(supportedBrowsers).join(', ')}`);
  }
  return normalized;
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function deepMerge(target, source) {
  if (Array.isArray(target) && Array.isArray(source)) {
    return source.slice();
  }

  if (isPlainObject(target) && isPlainObject(source)) {
    const result = { ...target };
    for (const [key, value] of Object.entries(source)) {
      if (key in result) {
        result[key] = deepMerge(result[key], value);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  return source;
}

function removeNullValues(obj) {
  if (Array.isArray(obj)) {
    return obj.map(removeNullValues).filter(item => item !== null);
  }

  if (isPlainObject(obj)) {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== null) {
        const cleanValue = removeNullValues(value);
        if (cleanValue !== null) {
          result[key] = cleanValue;
        }
      }
    }
    return result;
  }

  return obj;
}

async function copyDirectory(source, destination) {
  if (!(await pathExists(source))) {
    return;
  }

  await fs.mkdir(destination, { recursive: true });
  const entries = await fs.readdir(source, { withFileTypes: true });
  await Promise.all(
    entries.map(async (entry) => {
      const sourcePath = path.join(source, entry.name);
      const destinationPath = path.join(destination, entry.name);

      if (entry.isDirectory()) {
        await copyDirectory(sourcePath, destinationPath);
      } else if (entry.isFile()) {
        await fs.copyFile(sourcePath, destinationPath);
      }
    }),
  );
}

async function writeManifest(browser) {
  const baseManifestPath = path.join(repoRoot, 'config', 'manifest.base.json');
  const overridePath = path.join(repoRoot, 'config', `manifest.${browser}.json`);

  const baseManifest = JSON.parse(await fs.readFile(baseManifestPath, 'utf8'));
  let manifest = baseManifest;

  if (await pathExists(overridePath)) {
    const overrideManifest = JSON.parse(await fs.readFile(overridePath, 'utf8'));
    manifest = deepMerge(baseManifest, overrideManifest);
  }

  // Remove null values that were used to override base manifest properties
  manifest = removeNullValues(manifest);

  const distPath = path.join(repoRoot, 'dist', browser);
  await fs.mkdir(distPath, { recursive: true });
  await fs.writeFile(path.join(distPath, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

async function runBuild(browser) {
  const distDir = path.join(repoRoot, 'dist', browser);
  await fs.rm(distDir, { recursive: true, force: true });
  await fs.mkdir(distDir, { recursive: true });

  await Promise.all([
    copyDirectory(path.join(repoRoot, 'static', 'pages'), path.join(distDir, 'pages')),
    copyDirectory(path.join(repoRoot, 'static', 'styles'), path.join(distDir, 'styles')),
    copyDirectory(path.join(repoRoot, 'static', 'assets'), path.join(distDir, 'assets')),
  ]);

  await build({
    entryPoints: {
      background: path.join(repoRoot, 'src', 'background', 'index.ts'),
      content: path.join(repoRoot, 'src', 'content', 'index.ts'),
      popup: path.join(repoRoot, 'src', 'popup', 'index.ts'),
      reader: path.join(repoRoot, 'src', 'reader', 'index.ts'),
    },
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2020',
    sourcemap: true,
    minify: false,
    outdir: path.join(distDir, 'scripts'),
    logLevel: 'info',
  });

  await writeManifest(browser);
}

try {
  const browser = parseBrowserArgument();
  await runBuild(browser);
  console.log(`Built Sprint Reader for ${browser} into dist/${browser}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
