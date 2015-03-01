/* jshint node: true */
"use strict";

/**
 *	@fileoverview
 *	Combines the scripts and templates into a single file
 */

var gulp = require('gulp');
var tributary = require('gulp-tributary');
var escape = require( 'gulp-js-escape' );
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var rename = require('gulp-rename');


var paths = {
	template: 'src/dialog-template.htm',
	script: 'src/jquery.dialog.js'
};

gulp.task( 'build', function() {

	var template = gulp.src( paths.template )
		.pipe( escape() );

	gulp.src( paths.script )
		.pipe( tributary( template ) )
		.pipe(sourcemaps.init())
			.pipe( uglify() )
			.pipe( rename({extname: '.min.js'}) )
		.pipe(sourcemaps.write( '.'))
		.pipe( gulp.dest( 'dist' ) );
} );

gulp.task('watch', function() {
	gulp.watch( paths.template, ['build'] );
	gulp.watch( paths.script, ['build'] ); 
});

gulp.task( 'default', ['watch', 'build'] );





