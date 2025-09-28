// Configure Vitest to only run our project tests
// and exclude vendor/plugin caches like .trunk
export default {
  test: {
    include: ['test/**/*.test.js'],
    exclude: ['node_modules/**', '.trunk/**', '**/.trunk/**', '**/node_modules/**']
  }
}
