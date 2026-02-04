import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";

export default {
  input: "lib/jszip-entry.js",
  output: [
    {
      file: "dist/index.js",
      format: "es",
      sourcemap: true,
    },
    // {
    //   file: "dist/index.js",
    //   format: "cjs",
    //   exports: "default",
    //   sourcemap: true,
    // }
  ],
  plugins: [
    resolve({ browser: true, preferBuiltins: false }),
    commonjs({
      transformMixedEsModules: true,
    }),
  ],
};