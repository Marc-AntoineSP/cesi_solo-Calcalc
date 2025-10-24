import path from 'node:path';

import ejs from 'ejs';

export interface ViewRenderOption {
    viewsDir: string;
    cache?: boolean;
    globals?: Record<string, unknown>;
}

export default class ViewRender {
  private viewsDir: string;

  private baseOpts: ejs.Options;

  private globals: Record<string, unknown>;
  // A MODIFIER ET NORMALISER PLUS TARD si j'ai le temps. ouai.

  constructor({ viewsDir, cache = false, globals = {} }: ViewRenderOption) {
    this.viewsDir = viewsDir;
    this.baseOpts = { root: viewsDir, cache };
    this.globals = globals;
  }

  async render(pathRelLayout: string, pathRelPage: string, locals: Record<string, unknown> = {}) {
    const absolute = path.join(this.viewsDir, pathRelLayout);
    const data = {
      ...this.globals, ...locals, page: pathRelPage, locals,
    };
    return ejs.renderFile(absolute, data, { ...this.baseOpts, filename: absolute });
  }
}

/**
 * let template = ejs.compile(str, options);
template(data);
// => Rendered HTML string

ejs.render(str, data, options);
// => Rendered HTML string

ejs.renderFile(filename, data, options, function(err, str){
    // str => Rendered HTML string
});
Options
cache Compiled functions are cached, requires filename
filename Used by cache to key caches, and for includes
root Set project root for includes with an absolute path (e.g, /file.ejs).
Can be array to try to resolve include from multiple directories.
views An array of paths to use when resolving includes with relative paths.
context Function execution context
compileDebug When false no debug instrumentation is compiled
client Returns standalone compiled function
delimiter Character to use for inner delimiter, by default '%'
openDelimiter Character to use for opening delimiter, by default '<'
closeDelimiter Character to use for closing delimiter, by default '>'
debug Outputs generated function body
strict When set to `true`, generated function is in strict mode
_with Whether or not to use with() {} constructs. If false then the locals will be
stored in the locals object. (Implies `--strict`)
localsName Name to use for the object storing local variables when not using with Defaults to locals
rmWhitespace Remove all safe-to-remove whitespace, including leading and trailing
whitespace. It also enables a safer version of -%> line slurping for all scriptlet
tags (it does not strip new lines of tags in the middle of a line).
escape The escaping function used with <%= construct. It is used in rendering and
 is .toString()ed in the generation of client functions. (By default escapes XML).
outputFunctionName Set to a string (e.g., 'echo' or 'print') for a function to print
 output inside scriptlet tags.
async When true, EJS will use an async function for rendering. (Depends on async/await
 support in the JS runtime.
 */
