'use strict';

const { hostname } = require('os');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const Webpack = require('webpack');

const PRODUCTION = process.env.NODE_ENV === 'production';
const machine = hostname().toLowerCase();

module.exports = {
  entry: ['whatwg-fetch', './app/index.tsx'],
  output: {
    // The Go binary embeds this directory (internal/webapp). The tracked
    // .gitkeep keeps it present for builds without a frontend.
    path: `${__dirname}/internal/webapp/dist`,
    clean: { keep: /\.gitkeep$/ },
    filename: PRODUCTION ? '[name].[contenthash].js' : '[name].[fullhash].js',
    publicPath: '/',
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js'],
  },
  devtool: PRODUCTION ? 'source-map' : 'inline-source-map',
  devServer: {
    setupMiddlewares: (middlewares, devServer) => {
      if (!devServer) {
        throw new Error('webpack-dev-server is not defined');
      }

      // This adds a fake route during development that returns the string
      // "development" for the /version endpoint. This will make it so that the
      // new version banner doesn't show up all the time.
      devServer.app.get('/version', (req, res) => {
        res.send('development');
      });

      return middlewares;
    },
    historyApiFallback: true,
    // Allow the server machine's hostname and mDNS name, as well as IP addresses.
    allowedHosts: [machine, `${machine}.local`],
    host: '0.0.0.0',
    hot: true,
    // The dev launcher (cmd/dev) picks free ports per worktree and passes them
    // in. API_URL is the server /api goes to: the local API, or staging for
    // `mise start:web:staging`. Both serve the API under /api.
    port: Number(process.env.WEB_PORT) || 9898,
    proxy: {
      '/api': {
        target: process.env.API_URL || 'http://127.0.0.1:8647',
        changeOrigin: true,
      },
    },
    static: 'public/',
  },
  mode: PRODUCTION ? 'production' : 'none',
  module: {
    rules: [
      { test: /\.[jt]sx?$/, loader: 'babel-loader', exclude: /node_modules/ },
      { test: /\.scss$/, use: ['style-loader', { loader: 'css-loader', options: { url: false } }, 'sass-loader'] },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({ template: './app/index.html', filename: 'index.html', inject: 'body' }),
    new Webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV) || 'undefined',
      'process.env.VERSION': JSON.stringify(process.env.VERSION || 'development'),
    }),
  ],
};
