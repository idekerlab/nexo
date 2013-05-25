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

    var Node = Backbone.Model.extend({

        urlRoot: "/nexo",

        initialize: function () {
            console.log("Model Init called !!!!!!!!!!");
        }

    });

    var NodeView = Backbone.View.extend({

        render: function () {

            var summary = "<ul>";

            for (var key in this.model.attributes) {
                summary += "<li>" + key + ': ' + this.model.get(key) + "</li>";

                console.log(key + " == " + this.model.get(key));
            }

            summary += "</ul>";

            this.$el.html(summary).fadeIn(1000);
            return this;
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
            console.log(" - Selected: " + id);

            var newNode = new Node();
            console.log(" - isnew: " + newNode.isNew());
            newNode.set("id", id);
            console.log(" - isnew2: " + newNode.isNew());
            console.log(" - URL: " + newNode.url());
            var self = this;

            this.collection.pop();
            this.collection.add(newNode);


            this.$el.empty();

            newNode.fetch({

                success: function (data) {

                    var attr = data.attributes;
                    for (var key in attr) {
                        newNode.set(key, attr[key]);
                        console.log(key + " ----: " + newNode.get(key));
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
            console.log("Loading ...");

            var config = this.getConfig();
            var activator = new NodeActivator(config);

            var self = this;
            sigmaView.parseJson(graphFileLocation, function () {

                sigmaView.bind("upnodes", function (nodes) {
                    var selectedNodeId = nodes.content[0];
                    activator.activate(selectedNodeId, sigmaView);

                    var selectedNode = sigmaView._core.graph.nodesIndex[selectedNodeId];
                    self.viewManager.selected(selectedNode);
                });

                self.updateElements(sigmaView);

                // Render the view.
                sigmaView.draw();
            });
        },

        updateElements: function (sigmaView) {
            var hoover = this.getConfig().features.hoverBehavior;

            if (hoover === "dim") {
                this.dimNode(sigmaView);
            } else if (hoover === "hide") {
                this.hideNode(sigmaView);
            }

            this.zoomAction(sigmaView);
        },

        zoomAction: function (sigmaView) {
            $("#zoom").find("div.z").each(function () {

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
        },

        // Dimmer for nodes (when user points to a node)
        dimNode: function (sigmaView) {

            // TODO: Select Subtree (from selected node to root & children) run simple DFS

            sigmaView.bind("overnodes",function (event) {
                var nodes = event.content;
                var neighbors = {};

                sigmaView
                    .iterEdges(function (edge) {
                        if (nodes.indexOf(edge.source) < 0 && nodes.indexOf(edge.target) < 0) {
                            if (!edge.attr.grey) {
                                edge.attr.true_color = edge.color;
                                edge.color = DIM_COLOR;
                                edge.attr.grey = 1;
                            }
                        } else {
                            edge.color = edge.attr.grey ? edge.attr.true_color : edge.color;
                            edge.attr.grey = 0;

                            neighbors[edge.source] = 1;
                            neighbors[edge.target] = 1;
                        }
                    })

                    .iterNodes(function (node) {
                        if (!neighbors[node.id]) {
                            if (!node.attr.grey) {
                                node.attr.true_color = node.color;
                                node.color = DIM_COLOR;
                                node.attr.grey = 1;
                            }
                        } else {
                            node.color = node.attr.grey ? node.attr.true_color : node.color;
                            node.attr.grey = 0;
                        }
                    }).draw(2, 2, 2);

            }).bind('outnodes', function () {
                    sigmaView
                        .iterEdges(function (edge) {
                            edge.color = edge.attr.grey ? edge.attr.true_color : edge.color;
                            edge.attr.grey = 0;
                        })

                        .iterNodes(function (node) {
                            node.color = node.attr.grey ? node.attr.true_color : node.color;
                            node.attr.grey = 0;
                        }).draw(2, 2, 2);
                });
        },

        hideNode: function (sigInst) {

            sigInst.bind('overnodes',function (event) {
                var nodes = event.content;
                var neighbors = {};
                sigInst.iterEdges(function (e) {
                    if (nodes.indexOf(e.source) >= 0 || nodes.indexOf(e.target) >= 0) {
                        neighbors[e.source] = 1;
                        neighbors[e.target] = 1;
                    }
                }).iterNodes(function (n) {
                        if (!neighbors[n.id]) {
                            n.hidden = 1;
                        } else {
                            n.hidden = 0;
                        }
                    }).draw(2, 2, 2);
            }).bind('outnodes', function () {
                    sigInst.iterEdges(function (e) {
                        e.hidden = 0;
                    }).iterNodes(function (n) {
                            n.hidden = 0;
                        }).draw(2, 2, 2);
                });
        }
    };


    var NodeActivator = function (appConfig) {
        this.appConfig = appConfig;
    };

    NodeActivator.prototype.activate = function (nodeIndex, sigInst) {


        var config = this.appConfig;

        var groupByDirection = false;

        if (config.informationPanel.groupByEdgeDirection && config.informationPanel.groupByEdgeDirection === true) {
            groupByDirection = true;
        }

//        sigInst.neighbors = {};
//        sigInst.detail = !0;
        var node = sigInst._core.graph.nodesIndex[nodeIndex];

        console.log("Processing Selected node: " + node.label);

        $(".headertext").empty().append(node.label);

//        var outgoing = {};
//        var incoming = {};
//        var mutual = {};
//
//        sigInst.iterEdges(function (edge) {
//            edge.attr.lineWidth = !1;
//            edge.hidden = !0;
//
//            var n = {
//                name: edge.label,
//                colour: edge.color
//            };
//
//            if (nodeIndex === edge.source) {
//                outgoing[edge.target] = n;
//            } else if (nodeIndex === edge.target) {
//                incoming[edge.source] = n;
//            }
//
//            if (nodeIndex === edge.source || nodeIndex === edge.target) {
//                sigInst.neighbors[nodeIndex === edge.target ? edge.source : edge.target] = n;
//            }
//
//            edge.hidden = !1;
//            edge.attr.color = "rgba(0, 0, 0, 1)";
//        });
//
//        sigInst.iterNodes(function (node) {
//            node.hidden = !0;
//            node.attr.lineWidth = !1;
//            node.attr.color = node.color;
//        });
//
//        if (groupByDirection) {
//            for (var currentEdge in outgoing) {
//                if (currentEdge in incoming) {
//                    mutual[currentEdge] = outgoing[currentEdge];
//                    delete incoming[currentEdge];
//                    delete outgoing[currentEdge];
//                }
//            }
//        }


        // Show the summary panel
        $("#attributepane").animate({width: 'show'}, 250);

        var f = [];
//        if (groupByDirection) {
//            size = Object.size(mutual);
//            f.push("<h2>Mututal (" + size + ")</h2>");
//            (size > 0) ? f = f.concat(this.createList(mutual, a)) : f.push("No mutual links<br>");
//            size = Object.size(incoming);
//            f.push("<h2>Incoming (" + size + ")</h2>");
//            (size > 0) ? f = f.concat(this.createList(incoming, a)) : f.push("No incoming links<br>");
//            size = Object.size(outgoing);
//            f.push("<h2>Outgoing (" + size + ")</h2>");
//            (size > 0) ? f = f.concat(this.createList(outgoing, a)) : f.push("No outgoing links<br>");
//        } else {
//            f = f.concat(this.createList(sigInst.neighbors, a));
//        }
//
//        b.hidden = !1;
//        b.attr.color = b.color;
//        b.attr.lineWidth = 6;
//        b.attr.strokeStyle = "#000000";
//        sigInst.draw(2, 2, 2, 2);
//
//        $GP.info_link.find("ul").html(f.join(""));
//        $GP.info_link.find("li").each(function () {
//            var a = $(this),
//                b = a.attr("rel");
//        });
//        f = b.attr;
//        if (f.attributes) {
//            var image_attribute = false;
//            if (config.informationPanel.imageAttribute) {
//                image_attribute = config.informationPanel.imageAttribute;
//            }
//            e = [];
//            temp_array = [];
//            g = 0;
//            for (var attr in f.attributes) {
//                var d = f.attributes[attr],
//                    h = "";
//                if (attr != image_attribute) {
//                    h = '<span><strong>' + attr + ':</strong> ' + d + '</span><br/>'
//                }
//                //temp_array.push(f.attributes[g].attr);
//                e.push(h)
//            }
//
//            if (image_attribute) {
//                $GP.info_name.html(
//                    "<div><span onmouseover=\"sigInst._core.plotter.drawHoverNode(sigInst._core.graph.nodesIndex['"
//                        + b.id + '\'])" onmouseout="sigInst.refresh()">' + b.label + "</span></div>");
//            } else {
//                $GP.info_name.html("<div><span onmouseover=\"sigInst._core.plotter.drawHoverNode(sigInst._core.graph.nodesIndex['" + b.id + '\'])" onmouseout="sigInst.refresh()">' + b.label + "</span></div>");
//            }
//            // Image field for attribute pane
//            $GP.info_data.html(e.join("<br/>"))
//        }
//        $GP.info_p.html("Connections:");
//        $GP.info.animate({width: 'show'}, 350);
        $("#attributepane .left-close").click(function () {
            $("#attributepane").fadeOut(500);
        });


        //sigInst.active = nodeIndex;

        //window.location.hash = node.label;
    };

    NodeActivator.prototype.createList = function (edges, nodeIndex) {
        var f = [];
        var e = [],
            g;
        for (g in edges) {
            var d = sigInst._core.graph.nodesIndex[g];
            d.hidden = !1;
            d.attr.lineWidth = !1;
            d.attr.color = edges[g].colour;
            nodeIndex != g && e.push({
                id: g,
                name: d.label,
                group: (edges[g].name) ? edges[g].name : "",
                colour: edges[g].colour
            })
        }
        e.sort(function (a, b) {
            var c = a.group.toLowerCase(),
                d = b.group.toLowerCase(),
                e = a.name.toLowerCase(),
                f = b.name.toLowerCase();
            return edges != d ? c < d ? -1 : edges > d ? 1 : 0 : e < f ? -1 : e > f ? 1 : 0
        });
        d = "";
        for (g in e) {
            edges = e[g];
            f.push("<li class=\"membership\">" + edges.name + "</li>");
        }
        return f;
    };

    NodeActivator.prototype.zoomTo = function (node, sigmaView) {
        sigmaView.position(0, 0, 1).draw();
        sigmaView.zoomTo(node.displayX, node.displayY, 20);
        sigmaView.draw(2, 2, 2);
    };


    ///////////// Main ////////////



    var viewManager = new NodeListView();
    var nexo = new NexoApp(CONFIG_FILE, viewManager);

})();