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
  entry: './index.jsx',
  output: {
    path: `${__dirname}/public`,
    filename: 'bundle.js'
  },
  resolve: {
    extensions: ['', '.webpack.js', '.web.js', '.jsx', '.js']
  },
  devtool: PRODUCTION ? undefined : 'inline-source-map',
  devServer: {
    contentBase: 'public/',
    historyApiFallback: true
  },
  module: {
    loaders: [
      { test: /\.jsx?$/, loader: 'babel' },
      { test: /\.scss$/, loaders: ['style', 'css', 'sass'] },
      { test: /\.html/, loader: 'raw' }
    ]
  },
  plugins: PLUGINS
};
