module.exports = {
  chainWebpack: config => {
    // Enable loading .geojseon files.
    config.module
      .rule('geojson')
        .test(/\.geojson$/)
        .use('file-loader')
          .loader(require.resolve('file-loader'));
  }
}
