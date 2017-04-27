var gulp = require('gulp');
var concat  = require('gulp-concat');
var strip = require('gulp-strip-comments');
var uglify = require('gulp-uglify');
var headerfooter = require('gulp-header-footer');
var gulpSequence = require('gulp-sequence');

var header="\
/*\n\
    MIT LICENSE @2016 Ivan Lausuch <ilausuch@gmail.com>\n\
	Developed at CEU University\n\
*/";

gulp.task('compile', function(){
    return gulp.src('src/*.js')
        .pipe(strip())
        .pipe(concat('ilModels.js'))
        .pipe(headerfooter({
            header:header,
            footer:'',
            filter: function(file){
                return true;
            }
          }))
        .pipe(gulp.dest('dist'));
});

gulp.task('minimize', function(){
    return gulp.src('dist/ilModels.js')
        .pipe(strip())
        .pipe(uglify())
        .pipe(concat('ilModels.min.js'))
        .pipe(gulp.dest('dist'));
});

gulp.task("build",function(cb){
    gulpSequence('compile','minimize',cb);
});
