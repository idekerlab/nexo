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
var EMPTY_CYNETWORK = {
    graph: {
        elements: {
            nodes: [],
            edges: []
        }
    }
};
var GENE_COUNT_THRESHOLD = 100;

var GraphUtil = function () {
};

GraphUtil.prototype = {

    generateInteractions: function (paths) {
        var pathLength = paths.length;
        console.log("# of path = " + pathLength);

        var graph = {
            elements: {
                nodes: [],
                edges: []
            }
        };

        var nodes = [];

        for (var i = 0; i < pathLength; i++) {
            var path = paths[i];
            for (var j = 0; j < path.length; j++) {
                var edge = path[j];
                var source = edge[0];
                var target = edge[1];
                var sourceId = source["Assigned Genes"];
                var targetId = target["Assigned Genes"];

                if (_.contains(nodes, sourceId) == false) {
                    var sourceNode = {
                        data: {
                            id: sourceId
                        }
                    };
                    graph.elements.nodes.push(sourceNode);
                    nodes.push(sourceId);
                }

                if (_.contains(nodes, targetId) == false) {
                    var targetNode = {
                        data: {
                            id: targetId
                        }
                    };
                    graph.elements.nodes.push(targetNode);
                    nodes.push(targetId);
                }

                var newEdge = {
                    data: {
                        id: sourceId + "(raw_interaction) " + targetId,
                        source: sourceId,
                        target: targetId
                    }
                };

                graph.elements.edges.push(newEdge);
            }

        }
        return graph;
    },

    graphGenerator: function (graphJson) {

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
            this.parsePathEntry(nodeIdArray, edgeIdArray, graph, path);
        }

        nodeIdArray = null;
        edgeIdArray = null;

        return graph;
    },

    parsePathEntry: function (nodes, edges, graph, path) {
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

                var edgeName = sourceName + " (" + graphObject._label + ") " + targetName;
                if (_.contains(edges, edgeName) == false) {

                    var edge = {
                        data: {
                            id: edgeName,
                            interaction: graphObject._label,
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

var graphUtil = new GraphUtil();

//
// Get a term by ID.
//
exports.getByID = function (req, res) {

    "use strict";

    var id = req.params.id;
    var nameSpace = req.params.namespace;

//    var fullUrl = BASE_URL + "vertices/?key=name&value=";

    var fullUrl = BASE_URL +"indices/Vertex?key=name&value=";
    if (nameSpace === NEXO_NAMESPACE) {
        fullUrl = fullUrl + id;
    } else {
        fullUrl = fullUrl + nameSpace.toUpperCase() + ":" + id;
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

    var fullUrl = BASE_URL + "tp/gremlin?params={query:'" + query + "'}&script=keywordSearch()&load=[bykeyword]"
        + "&rexster.returnKeys=[name,Term]";

    console.log('FULL URL = ' + fullUrl);
    request.get(fullUrl, function (err, rest_res, body) {
        if (!err) {
            var results = JSON.parse(body);
            var resultArray = results.results;
            if (resultArray !== null && resultArray !== undefined && resultArray.length !== 0) {
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

    var fullUrl = BASE_URL + "tp/gremlin?params={query='" + query + "'}&script=search()&load=[bygene]" +
        "&rexster.returnKeys=[name,Assigned Genes,Assigned Orfs]";

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

exports.getRawInteractions = function (req, res) {

    "use strict";

    var id = req.params.id;
    var namespace = req.params.namespace;

    // Query should be list of genes
    console.log('ID = ' + id);

    var fullUrl = BASE_URL + "indices/Vertex?key=name&value=" + id + "&rexster.returnKeys=[name,Assigned Genes]";

    request.get(fullUrl, function (err, rest_res, body) {
        if (!err) {
            var results = JSON.parse(body);
            var resultArray = results.results;
            if (resultArray.length !== 0) {
                var genes = resultArray[0]["Assigned Genes"];
                genes = genes.replace("[", "");
                genes = genes.replace("]", "");
                genes = genes.replace(/ /g, "");
                genes = genes.replace(/,/g, " ");

                // Too many results
                var numGenes = genes.split(" ").length;
                if (numGenes > GENE_COUNT_THRESHOLD) {
                    console.log("TOO MANY inputs: " + numGenes);
                    res.json(EMPTY_CYNETWORK);
                    return;
                } else {
                    console.log("OK: " + numGenes);
                }

                var nextUrl = BASE_URL + "tp/gremlin?params={query='" + genes +
                    "'}&script=getRawInteractions()&load=[getinteractions]" +
                    "&rexster.returnKeys=[name,Assigned Genes]";

                console.log("URL == " + nextUrl);
                request.get(nextUrl, function (err2, rest_res2, body2) {
                    if (!err2) {
                        var results = JSON.parse(body2);
                        var resultArray = results.results;
                        if (resultArray.length !== 0) {
                            var graph = graphUtil.generateInteractions(resultArray);
                            var returnValue = {
                                graph: graph
                            };
                            res.json(returnValue);
                        } else {
                            res.json(EMPTY_OBJ);
                        }
                    }
                });
            } else {
                res.json(EMPTY_OBJ);
            }
        }
    });

};

exports.getPath = function (req, res) {
    "use strict";

    var rootNode = "joining_root";

    var nameSpace = req.params.namespace;
    var id = req.params.id;

    var getGraphUrl = BASE_URL + "tp/gremlin?script=";

    if (nameSpace === NEXO_NAMESPACE) {
        getGraphUrl = getGraphUrl + "g.V.has('name', '" + id + "')" +
            ".as('x').outE.filter{it.label != 'raw_interaction'}.filter{it.label != 'additional_gene_association'}." +
            "filter{it.label != 'additional_parent_of'}.inV.loop('x'){it.loops < 20}" +
            "{it.object.name.equals('" + rootNode + "')}.path&rexster.returnKeys=[name]";
    } else {
        // TODO: provide map oof ROOTS
        rootNode = "biological_process";
        getGraphUrl = getGraphUrl + "g.V.has('name', '" + nameSpace + ":" + id + "')" +
            ".as('x').outE.filter{it.label != 'raw_interaction'}.filter{it.label != 'additional_gene_association'}." +
            "filter{it.label != 'additional_parent_of'}.inV.loop('x'){it.loops < 20}" +
            "{it.object.'term name'.equals('" + rootNode + "')}.path&rexster.returnKeys=[name]";
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


exports.getAllParents = function (req, res) {
    "use strict";

    var id = req.params.id;

    var getGraphUrl = BASE_URL + "tp/gremlin?script=";

    getGraphUrl = getGraphUrl + "g.V.has('name', '" + id + "')" +
        ".as('x').outE.filter{it.label != 'raw_interaction'}.filter{it.label != 'additional_gene_association'}" +
        ".inV&rexster.returnKeys=[name]";

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
    "use strict";

    var nameSpace = req.params.namespace;
    var id = req.params.id;

    var fullUrl = "http://localhost:3000/" + nameSpace + "/" + id + "/path";

    console.log('Cy URL = ' + fullUrl);

    request.get(fullUrl, function (err, rest_res, body) {
        if (!err) {
            // This is an array.
            var results = JSON.parse(body);
            if (results != "" && results.length != 0) {
                var graph = graphUtil.graphGenerator(results);
                res.json(graph);
            } else {
                res.json(EMPTY_ARRAY);
            }
        }
    });
};
