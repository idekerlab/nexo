/**
 * Created with JetBrains WebStorm.
 * User: kono
 * Date: 2013/05/07
 * Time: 13:37
 * To change this template use File | Settings | File Templates.
 */

var request = require("request");

//
// Simply redirect the REST query
//
exports.getByID = function (req, res) {

    var EMPTY_OBJ = {};
    var fullUrl = "http://localhost:8182/graphs/neo4jnexo/vertices?key=name&value=NeXO:" + req.params.id;

    console.log('URL = ' + fullUrl);

    request.get(fullUrl, function (err, rest_res, body) {
        if (!err) {
            var results = JSON.parse(body);
            var resultArray = results.results;
            if(resultArray.length != 0) {
                res.json(resultArray[0]);
            } else {
                res.json(EMPTY_OBJ);
            }
        }
    });
};

exports.getByQuery = function (req, res) {

    var EMPTY_ARRAY = [];
    var fullUrl = "http://localhost:8182/graphs/neo4jnexo/tp/gremlin?script=g.V.filter{it.def.contains('%KEYWORD%')}";

    var query = req.params.query;
    console.log('Query = ' + query);

    fullUrl = fullUrl.replace("%KEYWORD%", query);

    request.get(fullUrl, function (err, rest_res, body) {
        if (!err) {
            var results = JSON.parse(body);
            var resultArray = results.results;
            if(resultArray.length != 0) {
                res.json(resultArray);
            } else {
                res.json(EMPTY_ARRAY);
            }
        }
    });
};

exports.getPath = function (req, res) {

    var EMPTY_ARRAY = [];
    var getGraphUrl = "http://localhost:8182/graphs/neo4jnexo/tp/gremlin?script=" +
        "g.V.has('name','NeXO:" + req.params.id +
        "').as('x').outE.inV.loop('x'){it.loops < 120}{it.object.name.equals('NeXO:joining_root')}.path";


    console.log('URL = ' + getGraphUrl);

    request.get(getGraphUrl, function (err, rest_res, body) {
        if (!err) {
            var results = JSON.parse(body);
            var resultArray = results.results;
            if(resultArray.length != 0) {
                res.json(resultArray);
            } else {
                res.json(EMPTY_ARRAY);
            }
        }
    });
};
