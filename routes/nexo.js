/**
 * Created with JetBrains WebStorm.
 * User: kono
 * Date: 2013/05/07
 * Time: 13:37
 * To change this template use File | Settings | File Templates.
 */

/* global exports */

var request = require("request");
var _ = require("underscore");

var BASE_URL = "http://localhost:8182/graphs/nexo-dag/";

var NEXO_NAMESPACE = "nexo";

var EMPTY_OBJ = {};
var EMPTY_ARRAY = [];

//
// Get a term by ID.
//
exports.getByID = function (req, res) {

    "use strict";

    var nameSpace = "nexo";
    var id = req.params.id;

    var fullUrl = BASE_URL + "vertices/?key=name&value=";
    if (nameSpace === NEXO_NAMESPACE) {
        fullUrl = fullUrl + id;
    } else {
        fullUrl = fullUrl + nameSpace + ":" + id;
    }

    console.log("URL = " + fullUrl);

    request.get(fullUrl, function (err, rest_res, body) {
        if (!err) {
            var results = JSON.parse(body);
            var resultArray = results.results;
            if (resultArray.length != 0) {
                res.json(resultArray[0]);
            } else {
                res.json(EMPTY_OBJ);
            }
        }
    });
};

exports.getByQuery = function (req, res) {
    "use strict";

    var query = req.params.query;
    console.log('Query = ' + query);


    var fullUrl = BASE_URL + "tp/gremlin?script=g.V.filter{" +
        "it.'CC Definition'.contains('" + query + "')||it.'BP Definition'.contains('" + query + "')||" +
        "it.'MF Definition'.contains('" + query + "')||it.'Assigned Orfs'.contains('" + query + "')||" +
        "it.'Assigned Genes'.contains('" + query + "')}";

    var searchUrl1 = BASE_URL + "tp/gremlin?script=g.idx('Vertex').query('','GO*')";
    var searchUrl2 = BASE_URL + "tp/gremlin?script=g.idx('Vertex').query('name','GO*')";
    fullUrl = BASE_URL + "tp/gremlin?script=g.idx('Vertex').query('name','GO*')";

    console.log('FULL URL = ' + fullUrl);
    request.get(fullUrl, function (err, rest_res, body) {
        if (!err) {
            var results = JSON.parse(body);
            var resultArray = results.results;
            if (resultArray.length != 0) {
                res.json(resultArray);
            } else {
                res.json(EMPTY_ARRAY);
            }
        }
    });
};

exports.getByGeneQuery = function (req, res) {

    "use strict";

    var query = req.params.query;
    console.log('Query = ' + query);

    var fullUrl = BASE_URL + "tp/gremlin?script=g.idx('Vertex').query('Assigned Genes','" + query + "')";

    console.log('FULL URL = ' + fullUrl);
    request.get(fullUrl, function (err, rest_res, body) {
        if (!err) {
            var results = JSON.parse(body);
            var resultArray = results.results;
            if (resultArray.length != 0) {
                res.json(resultArray);
            } else {
                res.json(EMPTY_ARRAY);
            }
        }
    });
};


exports.getPath = function (req, res) {
    "use strict";

    var nameSpace = req.params.namespace;
    var id = req.params.id;

    var getGraphUrl = BASE_URL + "tp/gremlin?script=";
    if (nameSpace === NEXO_NAMESPACE) {
        getGraphUrl = getGraphUrl +
            "g.V.has('name', '" + id +
            "').as('x').outE('parent_of').inV.loop('x'){it.loops < 15}{it.object.name.equals('joining_root')}.path";
    } else {
        // TODO add handler for other namespace
    }

    console.log('URL = ' + getGraphUrl);

    request.get(getGraphUrl, function (err, rest_res, body) {
        if (!err) {
            var results = JSON.parse(body);
            var resultArray = results.results;
            if (resultArray !== undefined && resultArray.length !== 0) {
                res.json(resultArray);
            } else {
                res.json(EMPTY_ARRAY);
            }
        }
    });
};

exports.getPathCytoscape = function (req, res) {

    var fullUrl = "http://localhost:3000/nexo/" + req.params.id + "/path";

    console.log('Cy URL = ' + fullUrl);

    request.get(fullUrl, function (err, rest_res, body) {
        if (!err) {
            // This is an array.
            var results = JSON.parse(body);
            if (results != "" && results.length != 0) {
                var graph = graphGenerator(results);
                res.json(graph);
            } else {
                res.json(EMPTY_ARRAY);
            }
        }
    });

    function graphGenerator(graphJson) {

        // Cytoscape.js style graph object.
        var graph = {
            elements: {
                nodes: [],
                edges: []
            }
        };

        var nodeIdArray = [];
        var edgeIdArray = [];

        for (var key in graphJson) {
            var path = graphJson[key];
            parsePathEntry(nodeIdArray, edgeIdArray, graph, path);
        }

        nodeIdArray = null;
        edgeIdArray = null;

        return graph;
    }

    function parsePathEntry(nodes, edges, graph, path) {
        var pathLength = path.length;

        var node = {};

        for (var i = 0; i < pathLength; i++) {
            var graphObject = path[i];
            if (graphObject['_type'] === "vertex") {

                node.data = {};
                node.data.id = graphObject.name;
                if (graphObject.name === "joining_root") {
                    node.data["size"] = 50;
                    node.data["border"] = 5;
                    node.data["border-color"] = "rgb(51,10,10)";
                    node.data["type"] = "root";
                } else if (i == 0) {
                    node.data["size"] = 50;
                    node.data["border"] = 5;
                    node.data["border-color"] = "rgb(0,0,50)";
                    node.data["type"] = "start";
                } else {
                    node.data["size"] = 20;
                    node.data["border"] = 2;
                    node.data["border-color"] = "rgb(10,10,10)";
                    node.data["type"] = "path";
                }
                if (_.contains(nodes, node.data.id) == false) {
                    graph.elements.nodes.push(node);
                    nodes.push(node.data.id);
                }
            } else {
                var sourceName = node.data.id;
                var target = path[i + 1];
                var targetName = "";
                if (target['_type'] != "vertex") {
                    var ex = new Error("Wrong input JSON.");
                    throw ex;
                } else {
                    targetName = target.name;
                }

                var edgeName = sourceName + " (" + graphObject.interaction + ") " + targetName;
                if (_.contains(edges, edgeName) == false) {

                    var edge = {
                        data: {
                            id: edgeName,
                            interaction: graphObject.interaction,
                            source: sourceName,
                            target: targetName
                        }
                    };
                    graph.elements.edges.push(edge);
                    edges.push(edgeName);
                }

                node = {};
            }
        }
    }

};