const gulp    = require('gulp');
const webpack = require('webpack-stream');

const browserifyOpts = {
  entries: ['./src/inject/inject.js']
};

gulp.task('default', ['copyRes', 'copyManifest', 'bundleSrc']);

gulp.task('copyRes', [], function() {
  gulp.src('res/**/*')
    .pipe(gulp.dest('dist/res'));
});

gulp.task('copyManifest', [], function() {
  gulp.src('manifest.json')
    .pipe(gulp.dest('dist'));
});

gulp.task('bundleSrc', [], bundleSrc);

gulp.task('test',
function bundleSrc() {
  gulp.src('./src/inject/inject.js')
    .pipe(webpack({
      output: {
        'path': __dirname + '/dist/inject',
        'filename': 'inject.js'
      }
    }))
    .pipe(gulp.dest('dist/inject/'))

}
