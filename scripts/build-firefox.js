const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const outputDir = path.join(rootDir, 'dist-firefox');

const SKIP_DIRS = new Set([
  '.git',
  '.github',
  'dist-firefox',
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

function build() {
  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(outputDir, { recursive: true });

  const manifestPath = path.join(rootDir, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  copyRecursive(rootDir, outputDir);

  const firefoxManifest = JSON.parse(JSON.stringify(manifest));

  if (!firefoxManifest.background) {
    throw new Error('manifest.json is missing a background definition');
  }

  delete firefoxManifest.background.service_worker;
  firefoxManifest.background.scripts = [
    'lib/browser-polyfill.js',
    'src/utility.js',
    'src/background.js'
  ];
  firefoxManifest.background.type = 'classic';

  const firefoxManifestPath = path.join(outputDir, 'manifest.json');
  fs.writeFileSync(firefoxManifestPath, `${JSON.stringify(firefoxManifest, null, 2)}\n`, 'utf8');

  console.log('Firefox manifest written to dist-firefox/manifest.json');
}

build();
