"use strict";

var gulp = require("gulp");
var gutil = require("gulp-util");
var webpack = require("webpack");
var nodemon = require("gulp-nodemon");
var del = require("del");


gulp.task("static-webpack", function(callback) {
// TODO css
  webpack({
    context: __dirname + "/static/scripts",
    entry: "./ggview.js",
    // plugins: [new webpack.optimize.UglifyJsPlugin()],
    output: {
      path: __dirname + "/build/static/scripts",
      filename: "ggview.js"
    }
  }, function(err, stats) {
    if(err) throw new gutil.PluginError("webpack", err);
    gutil.log("[webpack]", stats.toString({
        // output options
    }));
    callback();
  });
});

gulp.task("static-cp", function() {
  return gulp.src("static/**/*.html")
    .pipe(gulp.dest("build/static"));
});

gulp.task("clean", function() {
  return del(["build"]);
});

gulp.task("server", ["static-webpack", "static-cp"], function() {
  nodemon({
    script: "index.js",
    ext: "html js",
    ignore: ["build"],
    tasks: ["static-webpack", "static-cp"]
  });
});

gulp.task("default", ["server"]);
