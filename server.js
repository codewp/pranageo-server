const express   = require('express');
const fs        = require('fs');
const mdCreator = require('./utils/markdown-creator');
const config    = require('./config');
const app       = express();

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// Create items.
mdCreator.createItems(function(err, items) {
  if (err) {
    return console.log(err.message);
  }
});

// A route to get list of items.
app.get('/items', function(req, res){
  mdCreator.createItems(function(err, items) {
    if (err) {
      console.log(err.message);
      return res.send('error occurred!');
    }

    if (items) {
      return res.send({ 'items' : items });
    }
  });
})

// A route to downloading files.
app.get('/download/:fileName', function(req, res) {
  if (! req.params.fileName) {
    return res.send('error');
  }

  var file = config.FILES_DIR + req.params.fileName;
  if (! fs.existsSync(file)) {
    return res.send('error');
  } else {
    res.download(file);
  }
})

app.listen(config.PORT);
console.log('Magic happens on port ' + config.PORT);
exports = module.exports = app;
