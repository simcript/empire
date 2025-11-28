module.exports = {
  packagerConfig: {
    name: 'Empire',
    executableName: 'empire',
    asar: true,
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {},
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-vite',
      config: {
        build: [
          {
            entry: 'main.js',
            config: 'vite.main.config.js',
          },
          {
            entry: 'preload.js',
            config: 'vite.preload.config.js',
          },
        ],
        renderer: [
          {
            name: 'main_window',
            config: 'vite.renderer.config.js',
          },
        ],
      },
    },
  ],
}
