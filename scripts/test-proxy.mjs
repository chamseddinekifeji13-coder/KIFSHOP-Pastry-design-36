import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const root = resolve(import.meta.dirname, '..');
const pass = (msg) => console.log(`PASS: ${msg}`);
const fail = (msg) => { console.error(`FAIL: ${msg}`); process.exitCode = 1; };

console.log('=== TEST 1: File structure ===');

const proxyPath = resolve(root, 'proxy.ts');
const middlewarePath = resolve(root, 'middleware.ts');

if (existsSync(proxyPath)) {
  pass('proxy.ts exists');
} else {
  fail('proxy.ts NOT found');
}

if (existsSync(middlewarePath)) {
  fail('middleware.ts exists at root - will cause "Both middleware and proxy" error');
} else {
  pass('No middleware.ts at root (correct)');
}

console.log('\n=== TEST 2: proxy.ts exports ===');

const proxyContent = readFileSync(proxyPath, 'utf-8');

if (proxyContent.includes('export async function proxy')) {
  pass('proxy.ts has named export "proxy"');
} else if (proxyContent.includes('export default')) {
  pass('proxy.ts has default export');
} else {
  fail('proxy.ts missing valid export');
}

// Check for zero static imports (only dynamic imports allowed)
const staticImportLines = proxyContent.split('\n').filter(
  line => line.match(/^import\s/) && !line.match(/^import\s+type/)
);
if (staticImportLines.length === 0) {
  pass('proxy.ts has zero static imports (only dynamic imports) - safe from Turbopack PANIC');
} else {
  console.log('  WARNING: proxy.ts has static imports:', staticImportLines);
  console.log('  These may cause Turbopack PANIC if Turbopack is enabled');
}

console.log('\n=== TEST 3: /download is public route ===');

if (proxyContent.includes('/download') || proxyContent.includes('download')) {
  pass('/download detected as route in proxy.ts');
} else {
  fail('/download NOT found in proxy.ts - page will redirect to login');
}

console.log('\n=== TEST 4: package.json scripts ===');

const pkgContent = readFileSync(resolve(root, 'package.json'), 'utf-8');
const pkg = JSON.parse(pkgContent);

if (pkg.scripts.build && pkg.scripts.build.includes('--webpack')) {
  pass(`build script uses --webpack: "${pkg.scripts.build}"`);
} else {
  console.log(`  INFO: build script: "${pkg.scripts.build}" (no --webpack flag)`);
}

if (pkg.scripts.dev && pkg.scripts.dev.includes('--webpack')) {
  pass(`dev script uses --webpack: "${pkg.scripts.dev}"`);
} else {
  console.log(`  INFO: dev script: "${pkg.scripts.dev}" (no --webpack flag)`);
}

console.log('\n=== TEST 5: next.config.mjs ===');

const configPath = resolve(root, 'next.config.mjs');
const configContent = readFileSync(configPath, 'utf-8');

if (configContent.includes('experimental') && configContent.includes('turbopack')) {
  console.log('  WARNING: next.config.mjs has experimental turbopack setting');
} else {
  pass('next.config.mjs is clean (no invalid turbopack config)');
}

console.log('\n=== TEST 6: Build test ===');

try {
  // Clean .next
  execSync('rm -rf .next', { cwd: root, stdio: 'pipe' });
  pass('Cleaned .next directory');

  // Run build
  console.log('  Running: next build --webpack (this may take a minute)...');
  const buildOutput = execSync('npx next build --webpack 2>&1', {
    cwd: root,
    timeout: 120000,
    stdio: 'pipe',
    env: { ...process.env, NODE_ENV: 'production' }
  }).toString();

  if (buildOutput.includes('Build error') || buildOutput.includes('PANIC')) {
    fail('Build failed or had PANIC errors');
    console.log(buildOutput.slice(-2000));
  } else {
    pass('next build --webpack completed without PANIC');
    // Show last few lines
    const lines = buildOutput.trim().split('\n');
    console.log('  Build output (last 10 lines):');
    lines.slice(-10).forEach(l => console.log('    ' + l));
  }
} catch (err) {
  fail('Build threw an error');
  console.log('  Error:', err.message?.slice(0, 500));
  if (err.stdout) console.log('  stdout:', err.stdout.toString().slice(-1500));
  if (err.stderr) console.log('  stderr:', err.stderr.toString().slice(-1500));
}

console.log('\n=== SUMMARY ===');
console.log(process.exitCode ? 'Some tests FAILED' : 'All tests PASSED');
