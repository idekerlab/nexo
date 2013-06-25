
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , result = require('./routes/result')
  , nexo = require('./routes/nexo')
  , nexoView = require('./routes/nexoview')
  , http = require('http')
  , path = require('path');

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, '/public')));

// development only
if ('development' === app.get('env')) {
  app.use(express.errorHandler());
}

// Search queries
app.get('/search/:query', nexo.getByQuery);
app.get('/search/genes/:query', nexo.getByGeneQuery);
app.get('/search/names/:names', nexo.getByNames);

// ID query
app.get('/:namespace/:id', nexo.getByID);
app.get('/:namespace/:id/interactions', nexo.getRawInteractions);
app.get('/:namespace/:id/path', nexo.getPath);
app.get('/:namespace/:id/path.json', nexo.getPathCytoscape);
app.get('/:namespace/:id/parents', nexo.getAllParents);

app.get('/nexoview/:id', nexoView.showSummary);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
