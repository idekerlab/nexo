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
            var edgeNode = data.edges[j];

            var source = edgeNode.source;
            var target = edgeNode.target;
            var label = edgeNode.label;
            var eid = edgeNode.id;

            sigmaInstance.addEdge(eid, source, target, edgeNode);
        }


        console.log("Loading done!!!");

        if (callback !== undefined) {
            callback.call(this);
        }
    });
};
