/**
 * Created with JetBrains WebStorm.
 * User: kono
 * Date: 2013/05/06
 * Time: 13:54
 * To change this template use File | Settings | File Templates.
 */

exports.index = function (req, res) {

    var BASE_URL = "http://localhost:8182/graphs/neo4jnexo/";
    var QUERY_SEARCH_BY_KEYWORD = "tp/gremlin?script=g.V.filter{it.def.contains('%KEYWORD%')}";

    var NEXO_ID_PREFIX = "NeXO:";

    console.log('Query = ' + req.param('query'));
    var userQuery = req.param('query');

    var request = require("request");

    var queryString = QUERY_SEARCH_BY_KEYWORD.replace("%KEYWORD%", userQuery);
    var fullUrl = BASE_URL + queryString;

    console.log('URL = ' + fullUrl);

    request.get(fullUrl, function (err, res, body) {
        if (!err) {
            var resultsObj = JSON.parse(body);
            var results = resultsObj.results;
            //Just an example of how to access properties:
            console.log("Term name = " + results);
        }
    });

    res.render('result', { title: 'OK!'});
};