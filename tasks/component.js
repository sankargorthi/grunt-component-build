/*jshint node:true */
/*
 * grunt-component
 * https://github.com/anthonyshort/grunt-component-build
 *
 * Copyright (c) 2012 Anthony Short
 * Licensed under the MIT license.
 */

'use strict';

var Builder = require('component-builder');
var fs = require('fs');
var path = require('path');
var template = fs.readFileSync(__dirname + '/../lib/require.tmpl').toString();

module.exports = function(grunt) {

  // Please see the grunt documentation for more information regarding task and
  // helper creation: https://github.com/cowboy/grunt/blob/master/docs/toc.md

  // ==========================================================================
  // TASKS
  // ==========================================================================

  grunt.registerMultiTask('component', 'component-build for grunt.', function() {
    var self = this;
    var opts = this.data;
    var options = this.options();
    var name = opts.filename || opts.name || 'build';
    var dir = path.resolve(this.data.base || '');
    var output = path.resolve(options.out || 'build');
    var done = this.async();

    // The component builder
    var builder = new Builder(dir);

    // Where to output the final file
    builder.copyAssetsTo(output);

    // Prefix urls
    if (options.prefix) {
      builder.prefixUrls(opts.prefix);
    }

    // Development mode
    if (options.dev) {
      builder.development();
    }

    if (options.sourceUrls === true) {
      builder.addSourceURLs();
    }

    // Ignore component parts
    if (options.ignore) {
      Object.keys(options.ignore).forEach(function(n) {
        var type = opts.ignore[n];
        builder.ignore(n, type);
      });
    }

    // By default Builder takes the paths of the dependencies
    // from the current directory (here the Gruntfile path).
    // So in case the dependencies are not stored in the /components
    // but in the baseOption/components, we have to add it to the lookup.
    builder.addLookup(path.join(dir, 'components'));

    // The component config
    var config = require(path.join(dir, 'component.json'));

    // Lookup paths
    if (config.paths) {
      config.paths = config.paths.map(function(p) {
        return path.resolve(dir, p);
      });

      builder.addLookup(config.paths);
    }

    // Component Plugins
    if (options.use) {
      options.use.forEach(function(name) {
        builder.use(require(name));
      });
    }

    // Configure hook
    if (options.configure) {
      options.configure.call(this, builder);
    }

    // Build the component
    builder.build(function(err, obj) {

      if (err) {
        grunt.log.error(err.message);
        grunt.fatal(err.message);
      }

      // Write CSS file
      if (options.styles !== false) {
        var cssFile = path.join(output, name + '.css');
        grunt.file.write(cssFile, obj.css.trim());
      }

      // Write JS file
      if (options.scripts !== false) {
        var jsFile = path.join(output, name + '.js');
        if (opts.standalone) {
          // Defines the name of the global variable (window[opts.name]).
          // By default we use the name defined in the component.json,
          // else we use the `standalone` option defined in the Gruntfile.
          obj.name = (typeof opts.standalone === 'string') ? opts.standalone : config.name;
          obj.config = config;

          var string = grunt.template.process(template, { data: obj });
          grunt.file.write(jsFile, string);
        } else {
          grunt.file.write(jsFile, obj.require + obj.js);
        }
      }

      done();
    });
  });
};