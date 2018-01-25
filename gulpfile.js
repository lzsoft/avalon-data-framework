let gulp = require('gulp');
var minifyJS = require('gulp-minify');
let cleanCSS = require('gulp-clean-css');
var del = require('del');
gulp.task('js', function () {
    gulp.src('./src/**/*.js').pipe(minifyJS({
        ext: {
            min: '.js'
        },
        noSource: true
    })).pipe(gulp.dest('./min'));
});
gulp.task('css', function () {
    gulp.src('./src/**/*.css').pipe(cleanCSS({
        compatibility: '*'
    })).pipe(gulp.dest('./min'));
});
gulp.task('clean', function () {
    del('src/', {
        force: true
    });
});
gulp.task('build', ['css', 'js', 'clean']);