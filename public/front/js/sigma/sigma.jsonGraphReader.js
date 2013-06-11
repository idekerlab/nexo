sigma.publicPrototype.jsonGraphReader = function (dataPath, callback) {
    "use strict";

    var sigmaView = this;
    $.getJSON(dataPath, function (graph) {

        var numberOfNodes = graph.nodes.length;

        var nodes = graph.nodes;
        for (var idx = 0; idx < numberOfNodes; idx++) {
            var id = nodes[idx].id;
            sigmaView.addNode(id, graph.nodes[idx]);
        }

        var numberOfEdges = graph.edges.length;
        for (idx = 0; idx < numberOfEdges; idx++) {
            var originalEdge = graph.edges[idx];

            var source = originalEdge.source;
            var target = originalEdge.target;
            var label = originalEdge.relationship;
            var weight = originalEdge.weight;
            var edgeId = idx;

            var edge = {
                "source": source,
                "target": target,
                "weight": weight,
                "label": label,
                "id": edgeId.toString(),
                "attr": {}
            };
            sigmaView.addEdge(edgeId, source, target, edge);
        }

        if (callback !== undefined) {

            callback.call(this);
        }
    });
};