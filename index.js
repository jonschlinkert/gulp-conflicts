'use strict';

const path = require('path');
const through = require('through2');
const Conflicts = require('conflicts');

/**
 * Detect potential conflicts between existing files and the path and
 * contents of a vinyl file. If the destination `file.path` already
 * exists on the file system:
 *
 *   1. The existing file's contents is compared with `file.contents` on the vinyl file
 *   2. If the contents of both are identical, no action is taken, the file is skipped
 *   3. If the contents differ, the user is prompted for action
 *   4. If no conflicting file exists, the vinyl file is written to the file system
 *
 * ```js
 * app.src('foo/*.js')
 *   .pipe(conflicts('foo'))
 *   .pipe(app.dest('foo'));
 * ```
 * @param {String} `dest` The same desination directory passed to `app.dest()`
 * @return {String}
 * @api public
 */

module.exports = options => {
  if (typeof options === 'string' || typeof options === 'function') {
    options = { dest: options };
  }

  let opts = { cwd: process.cwd(), ...options };

  if (!opts.dest) {
    throw new TypeError('expected options.dest to be a string or function');
  }

  let conflicts = new Conflicts(opts);
  let dest = opts.dest;

  return through.obj(async(file, enc, next) => {
    if (conflicts.state.abort === true || file.isNull()) {
      next();
      return;
    }

    try {
      let destBase = typeof dest === 'function' ? dest(file) : dest;
      let destPath = path.resolve(destBase, file.relative);

      if (typeof opts.onFile === 'function') {
        await opts.onFile(file, destPath, opts);
      }

      conflicts.detectFile(file, destPath, opts)
        .then(() => next())
        .catch(next);

    } catch (err) {
      next(err);
    }

  }, function(cb) {
    conflicts.state.files.forEach(file => this.push(file));
    cb();
  });
};
