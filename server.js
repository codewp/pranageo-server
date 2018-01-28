const express   = require('express');
const fs        = require('fs');
const request   = require('request');
const cheerio   = require('cheerio');
const mdCreator = require('./utils/markdown-creator');
const app       = express();
const port      = 8081;

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.get('/items', function(req, res){
  request('https://cran.r-project.org/manuals.html', function(error, response, html){
    if (error) {
      return res.send('error occurred!');
    }

    var $     = cheerio.load(html),
        items = [],
        name  = link = '';

    $('table tbody tr').each(function() {
      name = $( 'td:nth-child(1) strong', $(this) ).html();
      if ( 'The R Reference Index' === name ) {
        return true;
      }
      link = $('td:nth-child(2) a', $(this)).first().attr('href');
      if ( name && name.length && link && link.length ) {
        items.push( { 'name' : name, 'link' : link } );
      }
    });

    if (! items.length) {
      return res.send('error occurred!');
    }

    for (var i = 0, max = items.length; i < max; i++) {
      link = mdCreator.createMarkdown(items[i].name, items[i].link);
      // Try again.
      if (! link) {
        link = mdCreator.createMarkdown(items[i].name, items[i].link);
      }

      if (! link) {
        return res.send('error occurred!');
      }
      items[i].link = 'http://localhost:' + port + '/' + link;
    }

    res.send({ 'items' : items });
  })
})

app.get('/download/:fileName', function(req, res) {
  if (! req.params.fileName) {
    return res.send('error');
  }

  var file = __dirname + '/files/' + req.params.fileName;
  if (! fs.existsSync(file)) {
    return res.send('error');
  }
  res.download(file);
})

app.listen(port);
console.log('Magic happens on port 8081');
exports = module.exports = app;
