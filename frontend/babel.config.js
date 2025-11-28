module.exports = {
  presets: [
    ['@babel/preset-env', {
      modules: false,
      targets: {
        browsers: ['> 0.25%', 'not dead', 'not op_mini all']
      }
    },
    '@babel/preset-typescript',
    '@babel/preset-react'
  ],
  plugins: [
    ['@babel/plugin-transform-runtime', {
      corejs: 3,
      helpers: true,
      regenerator: true,
      useESModules: false
    }
  ],
  env: {
    development: {
      plugins: ['transform-react-jsx-source']
    }
  },
  sourceType: 'unambiguous',
  comments: false,
  minified: false
};