const express   = require('express');
const fs        = require('fs');
const mdCreator = require('./utils/markdown-creator');
const app       = express();
const port      = 8081;

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

mdCreator.createItems().catch(reason => { console.log(reason) });

app.get('/items', function(req, res){
  mdCreator.createItems().then(function(value) {
    if (value) {
      return res.send({ 'items' : value });
    }

    return res.send('error occurred!');
  }).catch(function(reason) {
    console.log(reason);
    return res.send('error occurred!');
  });
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
