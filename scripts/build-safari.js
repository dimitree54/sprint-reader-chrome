const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const outputDir = path.join(rootDir, 'dist-safari');

const SKIP_DIRS = new Set([
  '.git',
  '.github',
  'dist-firefox',
  'dist-safari',
  'web-ext-artifacts',
  'node_modules'
]);

function copyRecursive(source, destination) {
  const stats = fs.statSync(source);

  if (stats.isDirectory()) {
    const dirName = path.basename(source);
    if (SKIP_DIRS.has(dirName)) {
      return;
    }

    fs.mkdirSync(destination, { recursive: true });
    const entries = fs.readdirSync(source);

    entries.forEach((entry) => {
      copyRecursive(path.join(source, entry), path.join(destination, entry));
    });

    return;
  }

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

function buildSafariBundle() {
  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(outputDir, { recursive: true });

  const manifestPath = path.join(rootDir, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  copyRecursive(rootDir, outputDir);

  const safariManifest = JSON.parse(JSON.stringify(manifest));

  if (!safariManifest.background) {
    throw new Error('manifest.json is missing a background definition');
  }

  delete safariManifest.background.service_worker;
  safariManifest.background.scripts = [
    'lib/browser-polyfill.js',
    'src/utility.js',
    'src/background.js'
  ];
  safariManifest.background.type = 'classic';

  safariManifest.permissions = (safariManifest.permissions || [])
    .filter((permission) => permission !== 'contextMenus');

  if (!safariManifest.permissions.includes('menus')) {
    safariManifest.permissions.push('menus');
  }

  const safariManifestPath = path.join(outputDir, 'manifest.json');
  fs.writeFileSync(safariManifestPath, `${JSON.stringify(safariManifest, null, 2)}\n`, 'utf8');

  console.log('Safari manifest written to dist-safari/manifest.json');
}

buildSafariBundle();
