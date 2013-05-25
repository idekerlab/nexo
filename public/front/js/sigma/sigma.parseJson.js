/**
 * Generate Sigma graph from JSON.
 *
 * @param jsonPath
 * @param callback
 */
sigma.publicPrototype.parseJson = function (jsonPath, callback) {

    "use strict";

    var sigmaInstance = this;

    $.getJSON(jsonPath, function (data) {

        console.log("Parsing JSON File: " + jsonPath);

        for (var i = 0; i < data.nodes.length; i++) {
            var id = data.nodes[i].id;
            sigmaInstance.addNode(id, data.nodes[i]);
        }

        for (var j = 0; j < data.edges.length; j++) {
            var originalEdge = data.edges[j];

            var source = originalEdge.source;
            var target = originalEdge.target;
            var label = originalEdge.relationship;
            var weight = originalEdge.weight;
            var edgeId = j;

            var edge = {
                "source": source,
                "target": target,
                "weight": weight,
                "label": label,
                "id": edgeId.toString(),
                "attr": {}
            };

            sigmaInstance.addEdge(edgeId, source, target, edge);
        }

        if (callback !== undefined) {
            callback.call(this);
        }
    });
};
