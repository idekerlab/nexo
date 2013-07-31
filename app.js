
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
app.use(express.static(path.join(__dirname, '/public')));
app.use(app.router);

// development only
if ('development' === app.get('env')) {
  app.use(express.errorHandler());
}

// Search queries
app.get('/search/genes/:query', nexo.getByGeneQuery);
app.get('/search/names/:names', nexo.getByNames);
app.get('/search/:namespace/:query', nexo.getByQuery);

// ID query
app.get('/:id', nexo.getByID);
app.get('/:id/interactions', nexo.getRawInteractions);
app.get('/:id/path', nexo.getPath);

// Term enrichment (by POST)
app.post('/enrich', nexo.enrich);

/**
 * Start server
 */
http.createServer(app).listen(app.get('port'), function(){
  console.log('NeXO App server listening on port ' + app.get('port'));
});
