import recommendedIncremental from 'eslint-config-agent/recommended-incremental'

export default [
  { ignores: ['dist/**', 'dev-dist/**', 'public/**', 'test-results/**', 'playwright-report/**'] },
  ...recommendedIncremental,
]
