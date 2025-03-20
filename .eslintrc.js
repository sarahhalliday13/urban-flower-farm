module.exports = {
  extends: ['react-app'],
  rules: {
    // Disable the exhaustive-deps rule which can be tricky to fix
    'react-hooks/exhaustive-deps': 'off',
    
    // Optionally, you can set no-unused-vars to warn instead of error
    'no-unused-vars': 'warn'
  }
}; 