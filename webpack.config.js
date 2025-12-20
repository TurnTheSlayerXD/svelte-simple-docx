const path = require('path');

module.exports = {
  entry: './src/svelte_constructor/main.js',

  output: {
    path: path.resolve(__dirname, 'dist-webpack'),
    filename: 'bundle.js',
  },

  module: {
    rules: [
      {
        test: [/\.svelte$/, /\.svelte\.js$/],
        use: {
          loader: 'svelte-loader',
          options: {
            compilerOptions: {
              dev: false,

            },
            onwarn: (warning, handler) => {
              const { code, frame } = warning;
              if (code === "css-unused-selector")
                return;

              handler(warning);
            },

          }
        }
      }
    ]
  },

  resolve: {
    extensions: ['.mjs', '.js', '.svelte', 'svelte', '.svelte.js'],
    mainFields: ['svelte', 'browser', 'module', 'main'],
    conditionNames: ['svelte', 'browser', 'module', 'import']
  },


  mode: 'development'
};
