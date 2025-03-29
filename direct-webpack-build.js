#!/usr/bin/env node
// Direct webpack build script that bypasses react-scripts entirely
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔨 Starting direct webpack build...');

try {
  // 1. Install webpack and required dependencies if not present
  console.log('Ensuring webpack dependencies are installed...');
  const packageJsonPath = path.join(__dirname, 'package.json');
  let packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Check if we need to install webpack
  const requiredDeps = [
    'webpack@5.75.0', 
    'webpack-cli@4.10.0', 
    'html-webpack-plugin@5.5.0', 
    'css-loader@6.7.1', 
    'style-loader@3.3.1', 
    'file-loader@6.2.0', 
    'babel-loader@8.2.5',
    '@babel/core@7.18.13', 
    '@babel/preset-env@7.18.10', 
    '@babel/preset-react@7.18.6'
  ];
  
  const missingDeps = requiredDeps.filter(dep => {
    return !packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep];
  });
  
  if (missingDeps.length > 0) {
    console.log(`Installing required dependencies: ${missingDeps.join(', ')}`);
    execSync(`npm install --no-save ${missingDeps.join(' ')}`, { stdio: 'inherit' });
  }

  // 2. Create webpack.config.js if it doesn't exist
  const webpackConfigPath = path.join(__dirname, 'webpack.config.js');
  if (!fs.existsSync(webpackConfigPath)) {
    console.log('Creating webpack.config.js...');
    
    const webpackConfig = `
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'bundle.[contenthash].js',
    publicPath: '/',
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react']
          }
        }
      },
      {
        test: /\\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
      },
      {
        test: /\\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
      },
    ]
  },
  resolve: {
    extensions: ['.js', '.jsx', '.json'],
    fallback: {
      "buffer": false,
      "crypto": false,
      "fs": false,
      "path": false,
      "stream": false,
      "util": false
    }
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
      favicon: './public/favicon.ico'
    })
  ],
  performance: {
    hints: false
  }
};
`;
    
    fs.writeFileSync(webpackConfigPath, webpackConfig);
  }

  // 3. Create .babelrc if it doesn't exist
  const babelrcPath = path.join(__dirname, '.babelrc');
  if (!fs.existsSync(babelrcPath)) {
    console.log('Creating .babelrc...');
    
    const babelrc = {
      "presets": [
        "@babel/preset-env",
        ["@babel/preset-react", { "runtime": "automatic" }]
      ],
      "plugins": []
    };
    
    fs.writeFileSync(babelrcPath, JSON.stringify(babelrc, null, 2));
  }

  // 4. Clean up existing build
  const buildDir = path.join(__dirname, 'build');
  if (fs.existsSync(buildDir)) {
    console.log('Cleaning existing build directory...');
    execSync(`rm -rf ${buildDir}`);
  }

  // 5. Copy static assets from public to build
  const publicDir = path.join(__dirname, 'public');
  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
  }
  
  console.log('Copying static assets...');
  execSync(`cp -R ${publicDir}/* ${buildDir}`, { stdio: 'inherit' });

  // 6. Run webpack
  console.log('Running webpack build...');
  execSync('NODE_OPTIONS="--max-old-space-size=4096" npx webpack --config webpack.config.js', {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      BABEL_ENV: 'production'
    }
  });

  console.log('✅ Build completed successfully!');
} catch (error) {
  console.error('❌ Build failed:', error);
  process.exit(1);
} 