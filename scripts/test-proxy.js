import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

const root = '/vercel/share/v0-project';
let pass = 0;
let fail = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    pass++;
  } catch (e) {
    console.log(`FAIL: ${name} -- ${e.message}`);
    fail++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg);
}

// ── Test 1: proxy.ts exists ──
test('proxy.ts exists', () => {
  assert(existsSync(join(root, 'proxy.ts')), 'proxy.ts not found');
});

// ── Test 2: NO middleware.ts at root ──
test('No middleware.ts at root', () => {
  assert(!existsSync(join(root, 'middleware.ts')), 'middleware.ts exists at root - will conflict with proxy.ts');
});

// ── Test 3: proxy.ts exports "proxy" function ──
test('proxy.ts exports async function proxy', () => {
  const content = readFileSync(join(root, 'proxy.ts'), 'utf8');
  assert(
    content.includes('export async function proxy'),
    'Missing "export async function proxy"'
  );
});

// ── Test 4: proxy.ts has NO static imports (only dynamic) ──
test('proxy.ts has zero static imports from @supabase or next/server', () => {
  const content = readFileSync(join(root, 'proxy.ts'), 'utf8');
  const lines = content.split('\n');
  const staticImports = lines.filter(l => 
    l.trim().startsWith('import ') && 
    (l.includes('@supabase') || l.includes('next/server'))
  );
  assert(
    staticImports.length === 0,
    `Found ${staticImports.length} static imports that cause Turbopack PANIC: ${staticImports.join(', ')}`
  );
});

// ── Test 5: proxy.ts uses dynamic imports ──
test('proxy.ts uses dynamic await import()', () => {
  const content = readFileSync(join(root, 'proxy.ts'), 'utf8');
  assert(
    content.includes("await import('@supabase/ssr')") || content.includes("await import(\"@supabase/ssr\")"),
    'Missing dynamic import for @supabase/ssr'
  );
  assert(
    content.includes("await import('next/server')") || content.includes("await import(\"next/server\")"),
    'Missing dynamic import for next/server'
  );
});

// ── Test 6: /download is a public route ──
test('/download is configured as public route', () => {
  const content = readFileSync(join(root, 'proxy.ts'), 'utf8');
  assert(
    content.includes('/download'),
    'Missing /download in public routes'
  );
});

// ── Test 7: config matcher exists ──
test('proxy.ts has config.matcher', () => {
  const content = readFileSync(join(root, 'proxy.ts'), 'utf8');
  assert(content.includes('export const config'), 'Missing export const config');
  assert(content.includes('matcher'), 'Missing matcher in config');
});

// ── Test 8: package.json scripts use --webpack ──
test('package.json build uses --webpack', () => {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  assert(
    pkg.scripts.build.includes('--webpack'),
    `build script is "${pkg.scripts.build}" - needs --webpack`
  );
});

test('package.json dev uses --webpack', () => {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  assert(
    pkg.scripts.dev.includes('--webpack'),
    `dev script is "${pkg.scripts.dev}" - needs --webpack`
  );
});

// ── Test 9: next.config.mjs has NO invalid turbopack config ──
test('next.config.mjs has no experimental.turbopack:false (invalid API)', () => {
  const content = readFileSync(join(root, 'next.config.mjs'), 'utf8');
  assert(
    !content.includes('turbopack: false') && !content.includes('turbopack:false'),
    'Found invalid "turbopack: false" in next.config.mjs'
  );
});

// ── Test 10: download page exists ──
test('app/download/page.tsx exists', () => {
  assert(existsSync(join(root, 'app/download/page.tsx')), 'Download page not found');
});

// ── Test 11: landing components exist ──
const landingComponents = ['navbar.tsx', 'hero-section.tsx', 'features-section.tsx', 'download-section.tsx', 'footer-section.tsx'];
for (const comp of landingComponents) {
  test(`components/landing/${comp} exists`, () => {
    assert(existsSync(join(root, `components/landing/${comp}`)), `${comp} not found`);
  });
}

// ── Test 12: Run next build --webpack ──
test('next build --webpack completes without error', () => {
  try {
    const output = execSync('cd /vercel/share/v0-project && npx next build --webpack 2>&1', {
      timeout: 120000,
      encoding: 'utf8',
      env: { ...process.env, NODE_ENV: 'production' }
    });
    console.log('  Build output (last 10 lines):');
    const lines = output.trim().split('\n');
    lines.slice(-10).forEach(l => console.log(`    ${l}`));
    assert(!output.includes('Error:'), 'Build output contains errors');
  } catch (e) {
    const stdout = e.stdout || '';
    const stderr = e.stderr || '';
    console.log('  Build STDERR (last 15 lines):');
    stderr.trim().split('\n').slice(-15).forEach(l => console.log(`    ${l}`));
    console.log('  Build STDOUT (last 10 lines):');
    stdout.trim().split('\n').slice(-10).forEach(l => console.log(`    ${l}`));
    throw new Error('Build failed - see output above');
  }
});

// ── Summary ──
console.log('\n========================================');
console.log(`RESULTS: ${pass} passed, ${fail} failed out of ${pass + fail} tests`);
console.log('========================================');
