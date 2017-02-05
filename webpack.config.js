'use strict';

const Path    = require('path');
const Webpack = require('webpack');

const PRODUCTION = process.env.NODE_ENV === 'staging' || process.env.NODE_ENV === 'production';

const PLUGINS = [
  new Webpack.DefinePlugin({ 'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development') }),
  new Webpack.ProvidePlugin({ React: 'react' })
];

if (PRODUCTION) {
  PLUGINS.push(new Webpack.optimize.DedupePlugin());
  PLUGINS.push(new Webpack.optimize.UglifyJsPlugin({ compress: { warnings: false } }));
}

module.exports = {
  context: Path.join(__dirname, 'app'),
  entry: ['babel-polyfill', './index.jsx'],
  output: {
    path: `${__dirname}/public`,
    filename: 'bundle.js'
  },
  resolve: {
    extensions: ['.jsx', '.js']
  },
  devtool: PRODUCTION ? 'source-map' : 'inline-source-map',
  devServer: {
    contentBase: 'public/',
    historyApiFallback: true
  },
  module: {
    rules: [
      { test: /\.jsx?$/, use: ['babel-loader'], exclude: /node_modules/ },
      { test: /\.scss$/, use: ['style-loader', 'css-loader', 'sass-loader'] },
      { test: /\.json/, use: ['json-loader'] },
      { test: /\.html/, use: ['raw-loader'] }
    ]
  },
  plugins: PLUGINS
};
