import { execSync } from 'child_process'

console.log('Cleaning .next cache...')
try {
  execSync('rm -rf .next', { stdio: 'inherit', cwd: '/vercel/share/v0-project' })
  console.log('.next cache deleted')
} catch (e) {
  console.log('Could not delete .next:', e.message)
}

console.log('Running pnpm install...')
try {
  execSync('pnpm install --no-frozen-lockfile', { stdio: 'inherit', cwd: '/vercel/share/v0-project', timeout: 60000 })
  console.log('pnpm install complete')
} catch (e) {
  console.log('pnpm install result:', e.message)
}
