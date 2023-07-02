module.exports = (api) => {
  api.cache(true);

  const plugins = [
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-proposal-optional-chaining',
  ];

  const presets = [
    ['@babel/preset-env', { corejs: 3, useBuiltIns: 'usage' }],
    ['@babel/preset-react', {
      // This is to opt into the new JSX Transform
      // (https://reactjs.org/blog/2020/09/22/introducing-the-new-jsx-transform.html).
      // This will be default in Babel 8, so we can remove this at that time.
      runtime: 'automatic',
    }],
    '@babel/preset-typescript',
  ];

  return { plugins, presets };
};
