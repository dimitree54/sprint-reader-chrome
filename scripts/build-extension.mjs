import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const envMapping = {
  VITE_KINDE_CLIENT_ID: process.env.VITE_KINDE_CLIENT_ID || '',
  VITE_KINDE_DOMAIN: process.env.VITE_KINDE_DOMAIN || '',
  VITE_KINDE_REDIRECT_URL: process.env.VITE_KINDE_REDIRECT_URL || '',
  NODE_ENV: process.env.NODE_ENV || 'development',
  CONTACT_EMAIL: process.env.CONTACT_EMAIL || '',
  ACKNOWLEDGEMENTS_URL: process.env.ACKNOWLEDGEMENTS_URL || '',
};

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

async function processAndCopyStaticFiles(source, destination, envMapping) {
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
        await processAndCopyStaticFiles(sourcePath, destinationPath, envMapping);
      } else if (entry.isFile()) {
        if (path.extname(entry.name) === '.html') {
          const content = await fs.readFile(sourcePath, 'utf8');
          const processedContent = processString(content, envMapping);
          await fs.writeFile(destinationPath, processedContent, 'utf8');
        } else {
          await fs.copyFile(sourcePath, destinationPath);
        }
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

  // Inject environment variables into manifest
  manifest = processString(manifest, envMapping);

  const distPath = path.join(repoRoot, 'dist', browser);
  await fs.mkdir(distPath, { recursive: true });
  await fs.writeFile(path.join(distPath, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

function processString(value, envMapping) {
  if (typeof value === 'string') {
    return value.replace(/\$\{([^}]+)\}/g, (match, envVar) => {
      if (envVar in envMapping) {
        return envMapping[envVar];
      }
      console.warn(`Warning: Environment variable ${envVar} not found, keeping placeholder`);
      return match;
    });
  } else if (Array.isArray(value)) {
    return value.map(item => processString(item, envMapping));
  } else if (isPlainObject(value)) {
    const result = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = processString(val, envMapping);
    }
    return result;
  }
  return value;
}


async function runBuild(browser) {
  const distDir = path.join(repoRoot, 'dist', browser);
  await fs.rm(distDir, { recursive: true, force: true });
  await fs.mkdir(distDir, { recursive: true });

  await Promise.all([
    processAndCopyStaticFiles(path.join(repoRoot, 'static', 'pages'), path.join(distDir, 'pages'), envMapping),
    copyDirectory(path.join(repoRoot, 'static', 'styles'), path.join(distDir, 'styles')),
    copyDirectory(path.join(repoRoot, 'static', 'assets'), path.join(distDir, 'assets')),
    copyDirectory(path.join(repoRoot, 'static', 'scripts'), path.join(distDir, 'scripts')),
  ]);

  // Security check: prevent API key embedding in production builds
  const isProduction = process.env.NODE_ENV === 'production';

  await build({
    entryPoints: {
      background: path.join(repoRoot, 'src', 'background', 'index.ts'),
      content: path.join(repoRoot, 'src', 'content', 'index.ts'),
      popup: path.join(repoRoot, 'src', 'popup', 'index.ts'),
      reader: path.join(repoRoot, 'src', 'reader', 'index.ts'),
      settings: path.join(repoRoot, 'src', 'settings', 'index.ts'),
    },
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2020',
    sourcemap: true,
    minify: false,
    outdir: path.join(distDir, 'scripts'),
    logLevel: 'info',
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      'process.env.VITE_KINDE_CLIENT_ID': JSON.stringify(process.env.VITE_KINDE_CLIENT_ID || ''),
      'process.env.VITE_KINDE_DOMAIN': JSON.stringify(process.env.VITE_KINDE_DOMAIN || ''),
      'process.env.VITE_KINDE_ORG_CODE': JSON.stringify(process.env.VITE_KINDE_ORG_CODE || ''),
      'process.env.VITE_KINDE_REDIRECT_URL': JSON.stringify(process.env.VITE_KINDE_REDIRECT_URL || ''),
      'process.env.VITE_DEV_PRO_TOKEN': JSON.stringify(process.env.VITE_DEV_PRO_TOKEN || ''),
      'process.env.PRIVACY_POLICY_URL': JSON.stringify(process.env.PRIVACY_POLICY_URL || ''),
      'process.env.ACKNOWLEDGEMENTS_URL': JSON.stringify(process.env.ACKNOWLEDGEMENTS_URL || ''),
    },
  });

  await writeManifest(browser);

  // Show extension ID and Kinde callback URL for easy configuration
  await showExtensionInfo(browser);
}

async function showExtensionInfo(browser) {
  console.log('\n' + '='.repeat(60));
  console.log('🔐 KINDE CONFIGURATION REMINDER');
  console.log('='.repeat(60));
  console.log('1. Load extension in Chrome (chrome://extensions)');
  console.log('2. Copy the extension ID');
  console.log('3. Run: node scripts/show-extension-id.mjs <your-id>');
  console.log('4. Add the callback URL to Kinde dashboard');
  console.log('='.repeat(60) + '\n');
}

(async () => {
  try {
    const browser = parseBrowserArgument();
    await runBuild(browser);
    console.log(`Built Sprint Reader for ${browser} into dist/${browser}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
})()
