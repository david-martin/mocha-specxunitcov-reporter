exports = module.exports = SpecXunitCov;

var mocha = require('mocha');
var Base = mocha.reporters.Base
  , cursor = Base.cursor
  , color = Base.color;
var JSONCov = mocha.reporters.JSONCov;
var fs = require('fs');

function coverageClass(n) {
  if (n >= 75) return 'high';
  if (n >= 50) return 'medium';
  if (n >= 25) return 'low';
  return 'terrible';
}

function SpecXunitCov(runner) {
  var self = this;

  // htmlcov
  var jade = require('jade')
    , file = __dirname + '/../node_modules/mocha/lib/reporters/templates/coverage.jade'
    , str = fs.readFileSync(file, 'utf8')
    , fn = jade.compile(str, { filename: file });

  // spec
  var stats = this.stats
    , indents = 0
    , n = 0;

  // xunit
  var tests = [];


  // run tests
  JSONCov.call(this, runner, false);

  function indent() {
    return Array(indents).join('  ')
  }

  runner.on('start', function(){
    // spec
    console.log();
  });

  runner.on('suite', function(suite){
    // spec
    ++indents;
    console.log(color('suite', '%s%s'), indent(), suite.title);
  });

  runner.on('suite end', function(suite){
    // spec
    --indents;
    if (1 == indents) console.log();
  });

  runner.on('test', function(test){
    // spec
    process.stdout.write(indent() + color('pass', '  ◦ ' + test.title + ': '));
  });

  runner.on('pending', function(test){
    // spec
    var fmt = indent() + color('pending', '  - %s');
    console.log(fmt, test.title);
  });

  runner.on('pass', function(test){
    // spec
    if ('fast' == test.speed) {
      var fmt = indent()
        + color('checkmark', '  ' + Base.symbols.ok)
        + color('pass', ' %s ');
      cursor.CR();
      console.log(fmt, test.title);
    } else {
      var fmt = indent()
        + color('checkmark', '  ' + Base.symbols.ok)
        + color('pass', ' %s ')
        + color(test.speed, '(%dms)');
      cursor.CR();
      console.log(fmt, test.title, test.duration);
    }

    // xunit
    tests.push(test);
  });

  runner.on('fail', function(test, err){
    // spec
    cursor.CR();
    console.log(indent() + color('fail', '  %d) %s'), ++n, test.title);

    // xunit
    tests.push(test);
  });


  var specCb = self.epilogue.bind(self);

  runner.on('end', function () {
    // spec
    specCb.call(this);

    // htmlcov
    fs.writeFileSync('coverage.html', fn({
      cov: self.cov
      , coverageClass: coverageClass
    }));

    // xunit
    fs.writeFileSync('test.xml', getXunitOutput(tests, stats));
  });
}

SpecXunitCov.prototype = new Base;
SpecXunitCov.prototype.constructor = SpecXunitCov;



function getXunitOutput(tests, stats) {
  var output = tag('testsuite', {
    name: 'Mocha Tests'
    , tests: stats.tests
    , failures: stats.failures
    , errors: stats.failures
    , skip: stats.tests - stats.failures - stats.passes
    , timestamp: (new Date).toUTCString()
    , time: stats.duration / 1000
  }, false);

  tests.forEach(function (test) {
    var attrs = {
      classname: test.parent.fullTitle()
      , name: test.title
      , time: test.duration / 1000
    };

    if ('failed' == test.state) {
      var err = test.err;
      attrs.message = escape(err.message);
      output += tag('testcase', attrs, false, tag('failure', attrs, false, cdata(err.stack)));
    } else if (test.pending) {
      output += tag('testcase', attrs, false, tag('skipped', {}, true));
    } else {
      output += tag('testcase', attrs, true);
    }
  }, output);
  output += '</testsuite>';

  return output;
}

/**
 * HTML tag helper.
 */

function tag(name, attrs, close, content) {
  var end = close ? '/>' : '>'
    , pairs = []
    , tag;

  for (var key in attrs) {
    pairs.push(key + '="' + escape(attrs[key]) + '"');
  }

  tag = '<' + name + (pairs.length ? ' ' + pairs.join(' ') : '') + end;
  if (content) tag += content + '</' + name + end;
  return tag;
}

/**
 * Return cdata escaped CDATA `str`.
 */

function cdata(str) {
  return '<![CDATA[' + escape(str) + ']]>';
}