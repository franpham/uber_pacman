"use strict";

// REMOVE THIS FILE FROM PROJECT FOLDER BEFORE RUNNING "meteor" -----------------------

var gulp = require('gulp');
var sass = require('gulp-sass');

// keeps gulp from crashing for scss errors; include foundation files;
gulp.task('sass', function () {
  return gulp.src('./sass/*.scss')
      .pipe(sass({
        errLogToConsole: true,
        sourceComments: true,
        includePaths: ['packages/foundation/scss']
      }).on('error', sass.logError))
      .pipe(gulp.dest('./client/styles'));
});

gulp.task('watch', function () {
  gulp.watch('./sass/**/*.scss', ['sass']);
  gulp.watch('./public/**/*', ['livereload']);
});

gulp.task('default', ['watch', 'sass']);