/**
 * Created with JetBrains WebStorm.
 * User: kono
 * Date: 2013/05/07
 * Time: 13:37
 * To change this template use File | Settings | File Templates.
 */

/* global exports */

var request = require("request");
var async = require('async');

var _ = require("underscore");

var BASE_URL = "http://localhost:8182/graphs/nexo-dag/";
var ENRICH_URL = "http://localhost:5000/enrich";

var ROOTS = {
    nexo: "NEXO:joining_root",
    bp: "biological_process",
    cc: "cellular_component",
    mf: "molecular_function"
};

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

var ITR_TYPES = [
    "physical", "genetic", "co-expression", "yeastNet"
];

// TODO: change to interaction TH.
var GENE_COUNT_THRESHOLD = 1500;

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
            var interactionType = ITR_TYPES[i % 4];
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
                        id: sourceId + "(" + interactionType + ") " + targetId,
                        source: sourceId,
                        target: targetId,
                        interaction: interactionType
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

    edgeListGenerator: function (graphJson) {

        var pathList = [];

        for (var key in graphJson) {
            var path = graphJson[key];
            pathList.push(this.parseEdge(path));
        }

        return pathList;
    },

    parseEdge: function (path) {
        var nodeList = [];

        _.each(path, function (graphObject) {
            if (graphObject['_type'] === "vertex") {
                nodeList.push(graphObject.name);
            }
        });

        return nodeList;

    },

    parsePathEntry: function (nodes, edges, graph, path) {
        var pathLength = path.length;

        var node = {};

        for (var i = 0; i < pathLength; i++) {
            var graphObject = path[i];
            if (graphObject['_type'] === "vertex") {

                node.data = {};
                node.data.id = graphObject.name;
                if (i === 0) {
                    node.data["type"] = "start";
                } else {
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

var Validator = function () {
};

Validator.prototype = {
    validate: function (id) {
        // Validation
        if (id === undefined || id === null || id === "") {
            return false;
        }

        var parts = id.split(":");
        if (parts.length === 2) {
            return true;
        } else if (id.match(/S/)) {
            return true;
        }

        return false;
    },

    validateQuery: function (id) {
        "use strict";
        return !(id === undefined || id === "");
    }

};

var validator = new Validator();

/**
 * Supported IDs are:
 *  - Ontology terms (NAMESPACE:ID)
 *  - SGD ID
 * @param req
 * @param res
 */
exports.getByID = function (req, res) {
    "use strict";

    var id = req.params.id;

    if (!validator.validate(id)) {
        console.log("INVALID: " + id);
        res.json(EMPTY_OBJ);
        return;
    }

    var fullUrl = BASE_URL + "indices/Vertex?key=name&value=" + id.toUpperCase();
    request.get(fullUrl, function (err, rest_res, body) {
        if (!err) {
            var results = JSON.parse(body);
            var resultArray = results.results;

            if (resultArray instanceof Array && resultArray.length !== 0) {
                res.json(resultArray[0]);
            } else {
                res.json(EMPTY_OBJ);
            }
        } else {
            console.warn('Could not get data for: ' + id);
            res.json(EMPTY_OBJ);
        }
    });
};

exports.getByQuery = function (req, res) {
    "use strict";

    var nameSpace = req.params.namespace;
    var rawQuery = req.params.query;
    console.log('Query = ' + rawQuery);
    console.log('NameSpace = ' + nameSpace);

    // Validate
    if (validator.validateQuery(rawQuery) === false) {
        res.json(EMPTY_ARRAY);
        return;
    }

    var phrase = rawQuery.match(/"[^"]*(?:""[^"]*)*"/g);
    console.log(phrase);

    var queryArray = [];

    var queryString = "";
    var wordsString = rawQuery;
    _.each(phrase, function (entry) {
        console.log("PH =: " + entry);
        var noQ = entry.replace(/\"/g, "");
        queryArray.push(noQ);
        noQ = noQ.replace(" ", "?");
        console.log("PH2 =: " + noQ);
        queryString = queryString + "*" + noQ + "* ";
        wordsString = wordsString.replace(entry, "");
        console.log("Cur string =: " + queryString);
    });

    console.log("Phrase string =: " + queryString);

    var words = wordsString.split(/ +/);
    var wordsCount = words.length;
    var idx = 0;
    _.each(words, function (word) {
        if (word !== "") {
            queryArray.push(word);
            if (idx === 0 && queryString === "") {
                queryString = queryString + "*" + word + "* ";
            } else {
                queryString = queryString + "AND *" + word + "* ";
            }
        }
    });


    queryString = queryString.replace(/:/, "?");
    queryString = queryString.substring(0, queryString.length - 1);

    console.log("Final String = " + queryString);
    var fullUrl = BASE_URL + "tp/gremlin?params={query:'" + queryString + "'}&script=keywordSearch()&load=[bykeyword]"
        + "&rexster.returnKeys=[name,label,BP Definition,CC Definition,MF Definition," +
        "BP Annotation,CC Annotation,MF Annotation,SGD Gene Description,def]";

    console.log('FULL URL = ' + fullUrl);

    request.get(fullUrl, function (err, rest_res, body) {
        if (!err) {
            try {
                var results = JSON.parse(body);
            } catch (ex) {
                console.log("Could not parse JSON: " + ex);
                res.json(EMPTY_ARRAY);
                return;
            }

            var resultArray = results.results;
            if (resultArray !== null && resultArray !== undefined && resultArray.length !== 0) {
                // Filter result
                var filteredResults = [];
                _.each(resultArray, function (entry) {
                    if (entry.name.indexOf(nameSpace) !== -1) {
                        filteredResults.push(entry);
                    }
                });

                filteredResults.unshift({queryArray: queryArray});
                res.json(filteredResults);
            } else {
                res.json(EMPTY_ARRAY);
            }
        }
    });

    function processResult() {

    }
};

exports.getByNames = function (req, res) {

    "use strict";
    var TH = 500;

    var names = req.params.names;
    var nameList = names.split(' ');
    var numberOfNames = nameList.length;

    var taskArray = [];

    if (numberOfNames > TH) {
        var blocks = Math.floor(numberOfNames / TH);
        var mod = numberOfNames % TH;

        var idx = 0;
        for (var i = 1; i <= blocks; i++) {
            var nameBlock = '';
            var maxIdx = i * TH;
            for (idx; idx < maxIdx; idx++) {

                nameBlock += nameList[idx] + ' ';
            }

            var blockUrl = BASE_URL + "tp/gremlin?script=g.idx('Vertex').query('name', '" + nameBlock + "')" +
                "&rexster.returnKeys=[name,Assigned Genes,Assigned Orfs]";
            taskArray.push(
                function (callback) {
                    fetch(blockUrl, callback);
                }
            );
        }

        var lastBlock = '';
        for(idx; idx<numberOfNames; idx++) {
            lastBlock += nameList[idx] + ' ';
        }

        var lastUrl = BASE_URL + "tp/gremlin?script=g.idx('Vertex').query('name', '" + lastBlock + "')" +
            "&rexster.returnKeys=[name,Assigned Genes,Assigned Orfs]";
        taskArray.push(
            function (callback) {
                fetch(lastUrl, callback);
            }
        );


    } else {
        var fullUrl = BASE_URL + "tp/gremlin?script=g.idx('Vertex').query('name', '" + names + "')" +
            "&rexster.returnKeys=[name,Assigned Genes,Assigned Orfs]";
        taskArray.push(
            function (callback) {
                fetch(fullUrl, callback);
            }
        );
    }


    async.parallel(

        taskArray,

        function (err, results) {
            if (err) {
                console.log(err);
                res.json(EMPTY_ARRAY);
            } else {
                var genes = [];
                _.each(results, function(result) {
                    genes = genes.concat(result);
                });

                res.json(genes);
            }
        });


    function fetch(fullUrl, callback) {
        request.get(fullUrl, function (err, rest_res, body) {
            if (!err) {
                var results = {};
                try {
                    results = JSON.parse(body);
                } catch (ex) {
                    console.error("Parse error: " + ex);
                    callback(null, EMPTY_ARRAY);
                }

                var resultArray = results.results;
                if (resultArray !== undefined && resultArray instanceof Array && resultArray.length !== 0) {
                    callback(null, resultArray);
                } else {
                    callback(null, EMPTY_ARRAY);
                }
            } else {
                console.error("ERROR! " + err.toString());
                callback(null, EMPTY_ARRAY);
            }
        });
    }
};


exports.getByGeneQuery = function (req, res) {

    "use strict";

    var rawQuery = req.params.query;
    console.log('Query = ' + rawQuery);

    // Validate
    if (validator.validateQuery(rawQuery) === false) {
        res.json(EMPTY_ARRAY);
        return;
    }

    var geneIds = rawQuery.split(/ +/g);
    var query = "";

    for (var i = 0; i < geneIds.length; i++) {
        if (i === geneIds.length - 1) {
            query += "*" + geneIds[i] + "*";
        } else {
            query += "*" + geneIds[i] + "* AND ";
        }
    }

    var fullUrl = BASE_URL + "tp/gremlin?params={query='" + query + "'}&script=search()&load=[bygene]" +
        "&rexster.returnKeys=[name,label,Assigned Genes,Assigned Orfs,Assigned Gene Synonyms]";
    request.get(fullUrl, function (err, rest_res, body) {
        if (!err) {
            var results = JSON.parse(body);
            var resultArray = results.results;
            if (resultArray !== undefined && resultArray instanceof Array && resultArray.length !== 0) {
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
    var fullUrl = BASE_URL + "indices/Vertex?key=name&value=" + id + "&rexster.returnKeys=[name,Assigned Genes]";

    request.get(fullUrl, function (err, rest_res, body) {
        if (!err) {
            var results = [];
            try {
                results = JSON.parse(body);
            } catch (ex) {
                res.json(EMPTY_CYNETWORK);
            }
            var resultArray = results.results;
            if (resultArray !== undefined && resultArray instanceof Array && resultArray.length !== 0) {
                var geneArray = resultArray[0]["Assigned Genes"];

                var geneString = geneArray.toString();
                var genes = geneString.replace(/,/g, " ");

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

                request.get(nextUrl, function (err2, rest_res2, body2) {
                    if (!err2) {
                        var results = [];
                        try {
                            results = JSON.parse(body2);
                        } catch (ex2) {
                            res.json(EMPTY_CYNETWORK);
                            return;
                        }

                        var resultArray = results.results;
                        if (resultArray !== undefined && resultArray.length !== 0) {
                            var graph = graphUtil.generateInteractions(resultArray);
                            var returnValue = {
                                graph: graph
                            };
                            res.json(returnValue);
                        } else {
                            res.json(EMPTY_CYNETWORK);
                        }
                    } else {
                        res.json(EMPTY_CYNETWORK);
                    }
                });
            } else {
                res.json(EMPTY_CYNETWORK);
            }
        } else {
            console.error("Error loading raw interactions.");
            res.json(EMPTY_CYNETWORK);
        }
    });
};

exports.getPath = function (req, res) {
    "use strict";

    var id = req.params.id;

    if (!validator.validate(id)) {
        res.json(EMPTY_ARRAY);
        return;
    }

    var ns = "";
    if (id.match(/S/)) {
        ns = "NEXO";
    } else {
        ns = id.split(":")[0];
    }


    var self = this;
    async.parallel([
        function (callback) {
            findPath(callback);
        },
        function (callback) {
            getNeighbor(callback);
        }
    ], function (err, results) {
        if (err) {
            console.log(err);
            res.json(EMPTY_ARRAY);
        } else {
            var mainPath = results[0];
            _.each(results[1], function (neighbor) {
                mainPath.push([id, neighbor]);
            });
            res.json(mainPath);
        }
    });

    function getNeighbor(callback) {

        var url = BASE_URL + "tp/gremlin?script=g.idx('Vertex')[[name: '" + id + "']]" +
            ".outE.filter{it.label != 'raw_interaction_physical'}.filter{it.label != 'raw_interaction_genetic'}" +
            ".filter{it.label != 'raw_interaction_co_expression'}.filter{it.label != 'raw_interaction_yeastNet'}" +
            ".inV&rexster.returnKeys=[name]";

        request.get(url, function (err, rest_res, body) {
            if (!err) {
                var results = JSON.parse(body);
                var resultArray = results.results;
                if (resultArray !== undefined && resultArray.length !== 0) {
                    // Simply extract node IDs.  Those are 1st neighbor.
                    var neighborList = [];
                    _.each(resultArray, function (neighbor) {
                        neighborList.push(neighbor.name);
                    });
                    callback(null, neighborList);
                } else {
                    callback(null, EMPTY_ARRAY);
                }
            }
        });
    }

    function findPath(callback) {

        var rootNode = ROOTS.nexo;
        if (ns === "NEXO") {

//        getGraphUrl = getGraphUrl + "g.V.has('name', '" + id + "')" +
//            ".as('x').outE.filter{it.label != 'raw_interaction'}.filter{it.label != 'additional_gene_association'}." +
//            "filter{it.label != 'additional_parent_of'}.inV.loop('x'){it.loops < 20}" +
//            "{it.object.name.equals('" + rootNode + "')}.path&rexster.returnKeys=[name]";

            var nexoUrl = BASE_URL + "tp/gremlin?script=g.idx('Vertex')[[name: '" + id + "']]" +
                ".as('x').outE.filter{it.label != 'additional_gene_association'}.filter{it.label != 'additional_parent_of'}" +
                ".filter{it.label != 'raw_interaction_physical'}.filter{it.label != 'raw_interaction_genetic'}" +
                ".filter{it.label != 'raw_interaction_co_expression'}.filter{it.label != 'raw_interaction_yeastNet'}" +
                ".inV.loop('x'){it.loops < 15}" +
                "{it.object.name=='" + rootNode + "'}.path&rexster.returnKeys=[name]";

            request.get(nexoUrl, function (err, rest_res, body) {
                if (!err) {
                    var results = JSON.parse(body);
                    var resultArray = results.results;
                    if (resultArray !== undefined && resultArray.length !== 0) {
                        callback(null, graphUtil.edgeListGenerator(resultArray));
                    } else {
                        callback(null, EMPTY_ARRAY);
                    }
                }
            });
        } else {
            var getNamespaceUrl = BASE_URL + "indices/Vertex?key=name&value=" + id + "&rexster.returnKeys=[namespace]";

            request.get(getNamespaceUrl, function (err, rest_res, body) {
                if (!err) {

                    var results = {};
                    try {
                        results = JSON.parse(body);
                    } catch (ex) {
                        console.log(ex);
                        callback(null, EMPTY_ARRAY);
                    }

                    var resultObj = results.results;
                    if (resultObj !== undefined && resultObj.length === 1) {

                        var nameSpace = resultObj[0].namespace;
                        var startNodeId = resultObj[0]._id;

                        var getGraphUrl = BASE_URL + "tp/gremlin?script=";
                        rootNode = nameSpace;

                        getGraphUrl = getGraphUrl + "g.v(" + startNodeId + ")" +
                            ".as('x').outE.inV.loop('x'){it.loops < 20}" +
                            "{it.object.'term name'.equals('" + rootNode + "')}.path&rexster.returnKeys=[name]";

                        console.log("Final URL: " + getGraphUrl);

                        request.get(getGraphUrl, function (err_in, rest_res_in, body_in) {
                            if (!err_in) {
                                var results = JSON.parse(body_in);
                                var resultArray = results.results;
                                if (resultArray !== undefined && resultArray instanceof Array && resultArray.length !== 0) {
                                    callback(null, graphUtil.edgeListGenerator(resultArray));
                                } else {
                                    callback(null, EMPTY_ARRAY);
                                }
                            }
                        });
                    } else {
                        callback(null, EMPTY_ARRAY);
                    }
                }
            });
        }
    }
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

exports.getGeneNames = function (req, res) {
    "use strict";

    console.log('@@@@@@@ GET GENES @@@@@@@@');

    var id = req.params.id;
    var getGraphUrl = BASE_URL + "tp/gremlin?script=";

    getGraphUrl = getGraphUrl + "g.V.has('name', '" + id + "')" +
        ".as('x').outE.filter{it.label != 'raw_interaction'}.filter{it.label != 'additional_gene_association'}" +
        ".inV&rexster.returnKeys=[name]";

    console.log('@@@@@@@ ger genes URL = ' + getGraphUrl);

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


//
// Handle POST for list of genes.
//
exports.getGeneNamesByPost = function (req, res) {
    'use strict';

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


exports.enrich = function (req, res) {
    'use strict';

    var genes = req.body.genes;
    var alphaStr = req.body.alpha;
    var ontologyType = req.body.type;

    var min = req.body['min-assigned'];

    var alpha = 0.01;

    if (alphaStr === undefined) {
        alpha = 0.01;
    } else {
        alpha = parseFloat(alphaStr);
    }

    if (ontologyType === undefined) {
        ontologyType = 'NEXO';
    }

    var parameter = {
        form: {
            'genes': genes,
            'alpha': alpha,
            'min-assigned': min,
            'type': ontologyType
        }
    };

    request.post(
        ENRICH_URL,
        parameter,
        function (err, rest_res, body) {
            if (!err) {
                console.log(body);
                var resultObj = {};
                try {
                    resultObj = JSON.parse(body);
                } catch (ex) {
                    console.warn("Could not parse enrich result: " + resultObj);
                    res.json(EMPTY_OBJ);
                    return;
                }

                console.log(resultObj);

                if (resultObj === undefined) {
                    res.json(EMPTY_OBJ);
                } else {
                    res.json(resultObj);
                }
            }
        });
};