let gulp = require('gulp');
var minifyJS = require('gulp-minify');
let cleanCSS = require('gulp-clean-css');
gulp.task('js', function () {
    gulp.src('./src/**/*.js').pipe(minifyJS({
        ext: {
            min: '.js'
        },
        noSource: true
    })).pipe(gulp.dest('./min/'));
});
gulp.task('css', function () {
    gulp.src('./src/**/*.css').pipe(cleanCSS({
        compatibility: '*'
    })).pipe(gulp.dest('./min/'));
});
gulp.task('build', ['css', 'js']);