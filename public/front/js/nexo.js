//
// NeXO View by Keiichiro Ono
//

/* global Backbone */
/* global sigma */

(function () {
    "use strict";

    var CONFIG_FILE = "nexo-config.json";

    // Presets for sigma.js
    var DEF_DRAWING_PROPS = {
        defaultLabelColor: "#000",
        defaultLabelSize: 14,
        defaultLabelBGColor: "#ddd",
        defaultHoverLabelBGColor: "#002147",
        defaultLabelHoverColor: "#fff",
        labelThreshold: 10,
        defaultEdgeType: "curve",
        hoverFontStyle: "bold",
        fontStyle: "bold",
        activeFontStyle: "bold"
    };

    var DEF_GRAPH_PROPS = {
        minNodeSize: 1,
        maxNodeSize: 7,
        minEdgeSize: 0.2,
        maxEdgeSize: 0.5
    };

    var DEF_MOUSE_PROPS = {
        minRatio: 0.75,
        maxRatio: 20
    };

    var DIM_COLOR = "#333333";


    // IDs & classes in the HTML document
    var ID_NODE_DETAILS = "#details";


    /////////// Models ///////////////////

    var TARGETS = {
        name: "Term ID",
        "Best Alignment GO Term ID": "Best Aligned GO",
        "BP Annotation": "BP Name",
        "BP Definition": "BP Def.",
        "CC Annotation": "CC Name",
        "CC Definition": "CC Def.",
        "MF Annotation": "MF Name",
        "MF Definition": "MF Def"
    };

    var TARGETS_GENE = {
        name: "Gene ID",
        "Assigned Genes": "Gene Name",
        "Assigned Orfs": "BP Name",
        "SGD Gene Description": "Description"
    };

    var EMPTY_RECORD = "N/A";
    var QUICK_GO_API = "http://www.ebi.ac.uk/QuickGO/GTerm?id=";
    var SGD_API = "http://www.yeastgenome.org/cgi-bin/locus.fpl?dbid=";

    var Node = Backbone.Model.extend({

        urlRoot: "/nexo",

        initialize: function () {
            console.log("Model Init called !!!!!!!!!!");
        }

    });

    var NodeView = Backbone.View.extend({


        render: function () {

            var entryId = this.model.get("name");

            var summary = "<div class='subnetwork'></div><table class=\"table table-striped\">";


            if (entryId.indexOf("S") === -1) {
                console.log("FOUND! " + entryId);
                summary = this.processEntry(summary);
            } else {
                console.log("NOT FOUND! " + entryId);
                summary = this.processGeneEntry(summary);
            }
            summary += "</table>";

            this.$el.html(summary).fadeIn(1000);
            return this;
        },

        processEntry: function (allValues) {

            for (var tableKey in TARGETS) {
                var tableValue = this.model.get(tableKey);
                if (tableValue === null || tableValue === "") {
                    tableValue = EMPTY_RECORD;
                }

                if (tableKey === "Best Alignment GO Term ID" && tableValue !== EMPTY_RECORD) {
                    tableValue = "<a href='" + QUICK_GO_API + tableValue + "' target='_blank'>" + tableValue + "</a>";
                }
                allValues += "<tr><td style='width: 120px'>" + TARGETS[tableKey] + "</td><td>" + tableValue + "</td></tr>";
            }

            return allValues;
        },

        processGeneEntry: function (allValues) {
            for (var tableKey in TARGETS_GENE) {
                var tableValue = this.model.get(tableKey);
                if (tableValue === null || tableValue === "") {
                    tableValue = EMPTY_RECORD;
                }

                if (tableKey === "name") {
                    tableValue = "<a href='" + SGD_API + tableValue + "' target='_blank'>" + tableValue + "</a>";
                } else if (tableKey === "SGD Gene Description") {
                    var descriptionList = "<ul>";
                    var entries = tableValue.split(";");
                    for (var i = 0; i < entries.length; i++) {
                        descriptionList += "<li>" + entries[i] + "</li>";
                    }
                    descriptionList += "</ul>";
                    tableValue = descriptionList;
                }
                allValues += "<tr><td style='width: 120px'>" + TARGETS_GENE[tableKey] + "</td><td>" + tableValue + "</td></tr>";
            }

            return allValues;
        }
    });

    var Nodes = Backbone.Collection.extend({

        model: Node,

        comparator: function (node) {
            return node.get("id");
        }
    });

    var NodeListView = Backbone.View.extend({

        el: ID_NODE_DETAILS,

        initialize: function () {
            this.collection = new Nodes();
        },

        render: function () {

            this.collection.each(function (node) {
                console.log("Rendering Node = " + node);
                this.renderNode(node);
            }, this);
        },

        renderNode: function (node) {
            var nodeView = new NodeView({
                model: node
            });

            var rendered = nodeView.render();
            console.log("rendered = " + rendered);

            this.$el.append(rendered.$el);
        },

        selected: function (selectedNode) {
            var id = selectedNode.id;

            var newNode = new Node();
            newNode.set("id", id);
            var self = this;

            this.collection.pop();
            this.collection.add(newNode);


            this.$el.empty();

            newNode.fetch({

                success: function (data) {

                    var attr = data.attributes;
                    for (var key in attr) {
                        newNode.set(key, attr[key]);
                    }
                    self.render();

                }
            });


        }
    });


    // Inject dependency: Backbone MV
    var NexoApp = function (configFileUrl, viewManager) {
        this.appConfig = {};
        this.viewManager = viewManager;

        this.initialize(configFileUrl);
    };

    NexoApp.prototype = {

        getConfig: function () {
            return this.appConfig;
        },


        initialize: function (configFileUrl) {
            var self = this;

            $.getJSON(configFileUrl, function (configObject) {
                self.appConfig = configObject;

                $(document).ready(self.initView(self.appConfig));
            });
        },

        initView: function (config) {
            // #title
            $("#title").html(config.text.title);

            // #titletext
            $("#titletext").html(config.text.intro);

            this.initNetworkView(config);
        },


        initNetworkView: function (config) {

            // Network data location
            var dataFileLocation = config.data;

            var drawingProps;
            var graphProps;
            var mouseProps;

            if (config.sigma === undefined) {
                throw new Error("Sigma configuration is missing.");
            }

            if (config.sigma.drawingProperties) {
                drawingProps = config.sigma.drawingProperties;
            } else {
                drawingProps = DEF_DRAWING_PROPS;
            }

            if (config.sigma.graphProperties) {
                graphProps = config.sigma.graphProperties;
            } else {
                graphProps = DEF_GRAPH_PROPS;
            }

            if (config.sigma.mouseProperties) {
                mouseProps = config.sigma.mouseProperties;
            } else {
                mouseProps = DEF_MOUSE_PROPS;
            }

            var sigmaView = sigma.init(
                    document.getElementById("sigma-canvas")).
                drawingProperties(drawingProps).
                graphProperties(graphProps).
                mouseProperties(mouseProps);
            sigmaView.active = !1;
            sigmaView.neighbors = {};
            sigmaView.detail = !1;

            this.render(sigmaView, dataFileLocation);
        },

        render: function (sigmaView, graphFileLocation) {

            var config = this.getConfig();
            var activator = new NodeActivator(config);

            var self = this;
            sigmaView.parseJson(graphFileLocation, function () {

                sigmaView.bind("upnodes",function (nodes) {

                    var selectedNodeId = nodes.content[0];
                    activator.activate(selectedNodeId, sigmaView);

                    console.log("node id = " + selectedNodeId);

                    var selectedNode = sigmaView._core.graph.nodesIndex[selectedNodeId];
                    self.viewManager.selected(selectedNode);

                    self.findPath(sigmaView, selectedNode);
                }).bind("upgraph", function (nodes) {
                        //self.refresh(sigmaView);
                    });

                self.updateElements(sigmaView);

                // Render the view.
                sigmaView.draw();
            });
        },

        updateElements: function (sigmaView) {
            this.zoomAction(sigmaView);
        },

        zoomAction: function (sigmaView) {
            var self = this;

            $("#commands").find("div.z").each(function () {

                var zoomButton = $(this);
                var zoomCommand = zoomButton.attr("rel");

                zoomButton.click(function () {

                    if (zoomCommand === "center") {
                        // Fit to window
                        sigmaView.position(0, 0, 1).draw();
                    } else {
                        // Zoom in/out
                        var sigmaCore = sigmaView._core;
                        var ratio = 1;

                        if (zoomCommand === "in") {
                            ratio = 1.5;
                        } else if (zoomCommand === "out") {
                            ratio = 0.5;
                        }

                        sigmaView.zoomTo(
                            sigmaCore.domElements.nodes.width / 2,
                            sigmaCore.domElements.nodes.height / 2,
                            sigmaCore.mousecaptor.ratio * ratio
                        );
                    }

                });
            });

            $("#commands").find("div.s").each(function () {

                var button = $(this);
                var command = button.attr("rel");

                button.click(function () {

                    if (command === "switch") {
                        // Fit to window
                        self.refresh(sigmaView);
                    }

                });
            });
        },

        refresh: function (sigmaView) {

            console.log("Refresh view.");

            sigmaView
                .iterEdges(function (edge) {
                    edge.color = edge.attr.grey ? edge.attr.true_color : edge.color;
                    edge.attr.grey = 0;
                })
                .iterNodes(function (node) {
                    node.color = node.attr.grey ? node.attr.true_color : node.color;
                    node.attr.grey = 0;
                    node.forceLabel = false;
                }).draw(2, 2, 2);
        },

        findPath: function (sigmaView, selectedNode) {
            var self = this;
            var nodeId = selectedNode.id;
            var url = "/nexo/" + nodeId + "/path.json";
            $.getJSON(url, function (path) {
                self.showPath(sigmaView, path);
            });
        },

        showPath: function (sigmaView, path) {

            var pathNodes = path.elements.nodes;

            // Boolean map for enable/disable nodes.
            var targetNodes = {};

            for (var i = 0; i < pathNodes.length; i++) {
                var cytoscapejsNode = pathNodes[i];
                var id = cytoscapejsNode.data.id;
                var sigmaNode = sigmaView._core.graph.nodesIndex[id];
                if (sigmaNode !== null) {
                    targetNodes[sigmaNode.id] = true;
                }
            }

            sigmaView
                .iterEdges(function (edge) {
                    var sourceId = edge.source.id;
                    var targetId = edge.target.id;

                    if (targetNodes[sourceId] === null && targetNodes[targetId] === null) {
                        // Not on the path.  DIM all of those.
                        if (!edge.attr.grey) {
                            edge.attr.true_color = edge.color;
                            edge.color = DIM_COLOR;
                            edge.attr.grey = 1;
                        }
                    } else {
                        edge.color = edge.attr.grey ? edge.attr.true_color : edge.color;
                        edge.attr.grey = false;
                    }
                })

                .iterNodes(function (node) {
                    if (!targetNodes[node.id]) {
                        if (!node.attr.grey) {
                            node.attr.true_color = node.color;
                            node.color = DIM_COLOR;
                            node.attr.grey = true;
                            node.forceLabel = false;
                        }
                    } else {
                        node.color = node.attr.grey ? node.attr.true_color : node.color;
                        node.attr.grey = false;
                        node.forceLabel = true;
                    }
                })

                .draw(2, 2, 2);
        }
    };


    var NodeActivator = function (appConfig) {
        this.appConfig = appConfig;
    };

    NodeActivator.prototype = {
        activate: function (nodeIndex, sigInst) {
            var config = this.appConfig;

            var groupByDirection = false;

            if (config.informationPanel.groupByEdgeDirection &&
                config.informationPanel.groupByEdgeDirection === true) {
                groupByDirection = true;
            }

            var node = sigInst._core.graph.nodesIndex[nodeIndex];

            console.log("Processing Selected node: " + node.label);

            $(".headertext").empty().append(node.label);

            // Show the summary panel
            $("#attributepane").animate({width: 'show'}, 250);

            $("#attributepane .left-close").click(function () {
                $("#attributepane").fadeOut(400);
            });
        },

        zoomTo: function (node, sigmaView) {
            sigmaView.position(0, 0, 1).draw();
            sigmaView.zoomTo(node.displayX, node.displayY, 20);
            sigmaView.draw(2, 2, 2);
        }
    };


    ///////////// Main ////////////
    var viewManager = new NodeListView();
    var nexo = new NexoApp(CONFIG_FILE, viewManager);

})();