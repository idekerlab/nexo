//
// NeXO View by Keiichiro Ono
//

/* global Backbone */
/* global sigma */
/* global d3 */
/* global $ */

(function () {
    "use strict";

    // Configuration file for this application
    var CONFIG_FILE = "../app-config.json";

    var LABEL_LENGTH_TH = 25;

    // Color for nodes that are not selected
    var DIM_COLOR = "rgba(220,220,220,0.7)";
    var SELECTED_NODE_COLOR = "rgba(70,130,180,0.9)";
    var QUERY_NODE_COLOR = "rgb(255,94,25)";

    // Tags in the HTML document
    var ID_NODE_DETAILS = "#details";
    var ID_SUMMARY_PANEL = "#summary-panel";
    var ID_SEARCH_RESULTS = "#mainpanel";

    var DEFAULT_NETWORK = "NeXO";

    var WAITING_BAR = '<div id="fadingBarsG">' +
        '<div id="fadingBarsG_1" class="fadingBarsG"></div>' +
        '<div id="fadingBarsG_2" class="fadingBarsG"></div>' +
        '<div id="fadingBarsG_3" class="fadingBarsG"></div>' +
        '<div id="fadingBarsG_4" class="fadingBarsG"></div>' +
        '<div id="fadingBarsG_5" class="fadingBarsG"></div>' +
        '<div id="fadingBarsG_6" class="fadingBarsG"></div>' +
        '<div id="fadingBarsG_7" class="fadingBarsG"></div>' +
        '<div id="fadingBarsG_8" class="fadingBarsG"></div></div>';

    var CATEGORY_MAP = {
        bp: "Biological Process",
        cc: "Cellular Component",
        mf: "Molecular Function"
    };

    var TARGETS = {
        "Biological Process": "",
        "BP Annotation": "Name",
        "BP Definition": "Definition",
        "Cellular Component": "",
        "CC Annotation": "Name",
        "CC Definition": "Definition",
        "Molecular Function": "",
        "MF Annotation": "Name",
        "MF Definition": "Definition"
    };

    var TARGETS_GENE = {
        name: "Gene ID",
        "Assigned Genes": "Gene Name",
        "Assigned Orfs": "ORF Name",
        "SGD Gene Description": "Description"
    };

    var EMPTY_RECORD = "N/A";

    ////////////////////////////////////////////////////////////////////
    // Links to other DB
    ////////////////////////////////////////////////////////////////////
    var QUICK_GO_API = "http://www.ebi.ac.uk/QuickGO/GTerm?id=";
    var SGD_API = "http://www.yeastgenome.org/cgi-bin/locus.fpl?dbid=";

    /*
     EventHelper (Mediator): This object listens to all events.
     */
    var eventHelper = _.extend({}, Backbone.Events);

    var viewEventHelper = _.extend({}, Backbone.Events);
    /*
     Custom Events
     */
    var NETWORK_LOADED = "networkLoaded";
    var INITIALIZED = "initialized";
    var NODE_SELECTED = "nodeSelected";
    var NODES_SELECTED = "nodesSelected";
    var SEARCH_RESULT_SELECTED = "searchResultSelected";

    var NETWORK_SELECTED = "networkSelected";

    var CLEAR = "clear";

    var SIGMA_RENDERER = sigma.init(document.getElementById("sigma-canvas"));
    var sigmaInitialized = false;


    /**
     * Manager object for network views.
     *
     * @constructor
     */
    var NetworkViewManager = function () {
        this.views = {};
        this.subnetwork = {};
    };

    NetworkViewManager.prototype = {
        getNetworkView: function (viewId) {
            return this.views[viewId];
        },

        addNetworkView: function (viewId, view) {
            this.views[viewId] = view;
        },

        setSubnetwork: function (cyNetwork) {
            this.subnetwork = cyNetwork;
        },

        getSubnetwork: function () {
            return this.subnetwork;
        }

    };

    var VIEW_MANAGER = new NetworkViewManager();


    var CyNetwork = Backbone.Model.extend({

        initialize: function () {
            this.updateURL();
            console.log("URL = " + this.url);
        },

        updateURL: function () {
            this.url = "/" + this.get("termId") + "/interactions";
        }
    });


    /*
     Sub-network view by cytoscape.js
     */
    var CyNetworkView = Backbone.View.extend({

        el: "#cy-network",

        events: {},

        render: function () {
            $("#cyjs").cytoscape(this.initSubnetworkView());
        },

        update: function (nodeId) {
            $("#cyjs").empty();

            // TODO: remove dependency!
            // check current network model:
            var currentNetwork = app.model.get("currentNetwork");
            var currentNetworkName = currentNetwork.get("name");
            if (currentNetworkName !== DEFAULT_NETWORK) {
                // No need to update
                return;
            }

            if (this.model === undefined || this.model === null) {
                this.model = new CyNetwork({namespace: "nexo", termId: nodeId});
            } else {
                this.model.set("termId", nodeId);
                this.model.updateURL();
            }

            this.render();
        },

        loadData: function () {
            var self = this;
            $("#cyjs").append(WAITING_BAR);
            this.model.fetch({
                success: function (data) {

                    var graph = data.attributes.graph;
                    var cy = self.model.get("cy");

                    eventHelper.trigger("subnetworkRendered", graph);

                    cy.load(graph.elements,

                        cy.layout((function () {
                            if (graph.elements.edges.length > 600) {
                                return {
                                    name: 'circle'
                                }
                            } else {
                                return {
                                    name: 'arbor',
                                    friction: 0.1,
                                    nodeMass: 2,
//                                        repulsion: 19800,
                                    edgeLength: 5.5
                                }
                            }
                        })()
                        ), function () {
                            console.log("Layout finished.");
                            $("#fadingBarsG").remove();
                            VIEW_MANAGER.setSubnetwork(cy.elements);

                        });
                }
            });
        },

        initSubnetworkView: function () {

            var self = this;

            var options = {
                showOverlay: false,
                boxSelectionEnabled: false,
                minZoom: 0.1,
                maxZoom: 5,

                style: cytoscape.stylesheet()
                    .selector('node')
                    .css({
                        'font-family': 'Roboto',
                        'font-size': 4,
                        'font-weight': 100,
                        'content': 'data(id)',
                        'text-halign': 'right',
                        'text-valign': 'bottom',
                        'color': 'rgb(235,235,235)',
                        'width': 5,
                        'height': 5,
                        'border-color': 'white',
                        "background-color": "rgba(222,222,222,0.9)",
                        "shape": "ellipse"
                    })
                    .selector(':selected')
                    .css({
                        'background-color': 'rgba(255,94,25,0.7)',
                        'color': 'rgba(255,94,25,0.9)',
                        'font-size': '8px',
                        'line-color': '#000',
                        'font-weight': 700
                    })
                    .selector('edge')
                    .css({
                        'width': 0.5,
                        "line-color": "#00ee11",
                        "opacity": 0.8
                    }),

                elements: {
                    nodes: [],
                    edges: []
                },

                ready: function () {
                    self.model.set("cy", this);
                    self.model.set("options", options);
                    self.loadData();
                }
            };
            return options;
        }
    });


    // Network object stored as Cytoscape.js style
    var Network = Backbone.Model.extend({
        // Only for getting data from fixed file location
        urlRoot: "/front/data",

        initialize: function () {
            var networkConfig = this.get("config");
            this.id = networkConfig.networkData;

            // Data status:
            this.set({hasNetworkData: false});

            if (this.get("loadAtInit")) {
                this.loadNetworkData();
            }
        },

        loadNetworkData: function () {
            var self = this;
            // Reset the Sigma view
            SIGMA_RENDERER.emptyGraph();

            var isNetworkLoaded = self.get("hasNetworkData");

            if (isNetworkLoaded) {
                console.log("Alredy has data");
                var graph = this.get("graph");
                this.convertGraph(graph.nodes, graph.edges);
                this.trigger(NETWORK_LOADED);
            } else {
                // Feed data to network only when necessary
                this.fetch({
                    success: function (data) {
                        console.log("Downloading data");
                        self.set({hasNetworkData: true});
                        var attr = data.attributes;
                        self.convertGraph(attr.nodes, attr.edges);
                        self.trigger(NETWORK_LOADED);
                    }
                });
            }
        },


        convertGraph: function (nodes, edges) {
            var graph = {
                nodes: [],
                edges: []
            };

            var numberOfNodes = nodes.length;
            _.each(nodes, function (node) {
                var id = node.id;
                var nodeLabel = node.label;
                node.fullLabel = nodeLabel;
                // Truncate if long
                if (nodeLabel.length > LABEL_LENGTH_TH) {
                    nodeLabel = nodeLabel.substring(0, LABEL_LENGTH_TH) + "...";
                    node.label = nodeLabel;
                }
                if (node.color === undefined) {
                    node.color = "rgba(33,30,45,0.4)";
                }

                SIGMA_RENDERER.addNode(id, node);
            });

            var idx = 0;
            _.each(edges, function (edge) {

                var source = edge.source;
                var target = edge.target;
                var label = edge.relationship;
                var weight = edge.weight;
                var edgeId = idx;


                var newEdge = {
                    "source": source,
                    "target": target,
                    "weight": weight,
                    "label": label,
                    "id": edgeId.toString()
                };
                SIGMA_RENDERER.addEdge(edgeId, source, target, newEdge);
                idx++;
            });

            // Save the data to model
            graph.nodes = nodes;
            graph.edges = edges;
            this.set({graph: graph});
        }
    });


    var Networks = Backbone.Collection.extend({
    });

    var NetworkManagerView = Backbone.View.extend({

        el: "#commands",

        events: {
            "click .popover-content .networkName": "networkSelected"
        },

        collection: Networks,

        initialize: function () {
            this.render();
        },

        render: function () {
            var trees = $("#trees");
            trees.empty();

            var listString = "<ul class='nav nav-pills nav-stacked'>";
            var treeCount = this.collection.length;
            for (var i = 0; i < treeCount; i++) {
                var network = this.collection.at(i);
                var networkName = network.get("config").name;
                console.log(networkName);
                listString += "<li class='networkName'>" + networkName + "</li>";
            }

            listString += "</ul>";
            trees.attr("data-content", listString);
        },

        networkSelected: function (e) {
            var selectedNetworkName = e.currentTarget.textContent;
            var selectedNetwork = this.collection.where({name: selectedNetworkName});
            this.collection.trigger(NETWORK_SELECTED, selectedNetwork);

            // Hide popover
            this.$el.find("#trees").popover("hide");

        }
    });

    var NetworkView = Backbone.View.extend({

        el: "#sigma-canvas",

        events: {
            "dblclick": "refresh"
        },

        initialize: function () {
            var self = this;

            SIGMA_RENDERER.bind("upnodes", function (nodes) {
                var selectedNodeId = nodes.content[0];
                var networkName = self.model.get("name");
                // TODO: use current network name
                if (networkName === $("#network-title").text()) {
                    self.findPath(selectedNodeId);
                    self.trigger(NODE_SELECTED, selectedNodeId);
                }
            });
            self.bindCommands();

            // Render the network once its model is ready.
            eventHelper.listenToOnce(this.model, NETWORK_LOADED, _.bind(this.render, this));
        },

        render: function () {
            console.log("Rendering sigma view:");

            var networkConfig = this.model.get("config");
            var drawingProps = networkConfig.sigma.drawingProperties;
            var graphProps = networkConfig.sigma.graphProperties;
            var mouseProps = networkConfig.sigma.mouseProperties;

            SIGMA_RENDERER.
                drawingProperties(drawingProps).
                graphProperties(graphProps).
                mouseProperties(mouseProps);

            SIGMA_RENDERER.refresh();
            SIGMA_RENDERER.draw();
        },


        selectNodes: function (selectedNodes) {
            console.log(selectedNodes);

            if (selectedNodes === undefined || selectedNodes instanceof Array === false) {
                // Invalid parameter.
                return;
            }

            var targetNodes = [];
            _.each(selectedNodes, function (node) {
                var id = node.get("name");
                var sigmaNode = SIGMA_RENDERER._core.graph.nodesIndex[id];
                if (sigmaNode !== undefined) {
                    targetNodes[sigmaNode.id] = true;
                }
            });

            this.highlight(targetNodes, true);
        },

        zoomTo: function (id) {
            var lastNode = this.model.get("lastSelected");
            console.log("Last = " + lastNode);
            console.log("Zooming to " + id);
            if (lastNode != null) {
                // Clear last selection
                lastNode.color = lastNode.original_color;
                lastNode.original_color = null;
            }
            var node = SIGMA_RENDERER._core.graph.nodesIndex[id];
            node.original_color = node.color;
            node.color = QUERY_NODE_COLOR;

            SIGMA_RENDERER.position(0, 0, 1).draw();
            SIGMA_RENDERER.zoomTo(node.displayX, node.displayY, 40);
            SIGMA_RENDERER.draw(2, 2, 2);
            this.model.set("lastSelected", node);
        },


        bindCommands: function () {
            var self = this;
            var sigmaView = SIGMA_RENDERER;
            var commands = $("#commands");

            commands.find("div.z").each(function () {

                var zoomButton = $(this);
                var zoomCommand = zoomButton.attr("rel");

                zoomButton.tooltip({delay: { show: 200, hide: 100 }});

                zoomButton.click(function () {

                    if (zoomCommand === "center") {
                        // Fit to window
                        sigmaView.position(0, 0, 1).draw();
                    } else {
                        // Zoom in/out
                        var sigmaCore = sigmaView._core;
                        var ratio = 1;

                        if (zoomCommand === "in") {
                            ratio = 1.2;
                        } else if (zoomCommand === "out") {
                            ratio = 0.8;
                        }

                        sigmaView.zoomTo(
                            sigmaCore.domElements.nodes.width / 2,
                            sigmaCore.domElements.nodes.height / 2,
                            sigmaCore.mousecaptor.ratio * ratio
                        );
                    }

                });
            });

            commands.find("div.s").each(function () {

                var button = $(this);
                var command = button.attr("rel");

                button.popover({
                    html: true,
                    placement: "top"
                });

                if (command === "refresh") {
                    button.click(function () {
                        console.log("Refresh called");
                        self.refresh();
                    });
                }

            });
        },

        findPath: function (nodeId) {
            var self = this;

            var url = "/" + nodeId + "/path";
            $.getJSON(url, function (path) {
                self.showPath(path);
            });
        },


        /**
         * Add edges to the first neighbour of query node (if does not exist in the tree.)
         *
         * @param pathArray
         */
        addHiddenEdges: function (pathArray) {

            // Query node is ALWAYS idx 0 of list.
            var source = pathArray[0][0];
            var targets = [];

            _.each(pathArray, function (path) {
                targets.push(path[1]);
            });

            // Reset current state
            var edgeNames = {};
            SIGMA_RENDERER
                .iterEdges(function (edge) {
                    if (edge.label === "extra") {
                        SIGMA_RENDERER.dropEdge(edge.id);
                    } else {
                        var edgeName = edge.source + "-" + edge.target;
                        edgeNames[edgeName] = true;
                    }
                });

            var extraEdges = [];

            _.each(targets, function (target) {
                var edgeName = source + "-" + target;
                if (!edgeNames[edgeName]) {
                    // Edge does not exists.  Add to view
                    if (SIGMA_RENDERER._core.graph.nodesIndex[source] &&
                        SIGMA_RENDERER._core.graph.nodesIndex[target]) {

                        // Add edge
                        var newEdge = {
                            source: source,
                            target: target,
                            weight: 0.8,
                            size: 0.8,
                            label: "extra",
                            id: edgeName,
                            type: "curve",
                            attr: {
                                type: "extra"
                            }
                        };
                        if (!SIGMA_RENDERER._core.graph.edgesIndex[edgeName]) {
                            SIGMA_RENDERER.addEdge(edgeName, source, target, newEdge);
                            extraEdges.push(newEdge);
                        }
                    }
                }
            });
            this.model.set("extraEdges", extraEdges);
            return edgeNames;
        },


        /**
         *
         * @param pathArray - Array of lists.  Each list contains sequence of Term IDs.
         */
        showPath: function (pathArray) {

            // Ignore if path data is not available.
            if (pathArray === undefined || pathArray.length === 0) {
                return;
            }

            console.log("@showpath called: number of path = " + pathArray.length);
            // Add edges from DAG (1st neighbours only)
            var edgeExists = this.addHiddenEdges(pathArray);

            // Valid path - all nodes exists on the current view.
            var validPaths = [];
            var targetNodes = {};
            _.each(pathArray, function (path) {
                targetNodes[path[1]] = true;
                // neighbours are always valid.
                var isValidPath = true;
                var pathLength = path.length;
                for (var i = 0; i < pathLength - 1; i++) {
                    var edge = edgeExists[[path[i] + "-" + path[i + 1]]];
                    if (edge === undefined) {
                        isValidPath = false;
                        break;
                    }
                }
                if (isValidPath) {
                    validPaths.push(path);
                }
            });


            _.each(validPaths, function (path) {
                _.each(path, function (pathNode) {
                    targetNodes[pathNode] = true;
                });
            });

            console.log(targetNodes);
            this.highlight(targetNodes, false, pathArray[0][0]);
        },

        refresh: function () {
            SIGMA_RENDERER
                .iterEdges(function (edge) {
                    if (edge.label === "extra") {
                        SIGMA_RENDERER.dropEdge(edge.id);
                    }
                    edge.color = edge.attr.original_color;
                    edge.attr.grey = false;
                })
                .iterNodes(function (node) {
                    node.color = node.attr.original_color;
                    node.attr.grey = false;
                    node.forceLabel = false;
                });
            this.fit();
        },

        fit: function () {
            SIGMA_RENDERER.position(0, 0, 1).draw();
        },

        highlight: function (targetNodes, nodesOnly, queryNode) {

            if (nodesOnly === false) {
                SIGMA_RENDERER.iterEdges(function (edge) {
                    if (edge.color !== SELECTED_NODE_COLOR && edge.color !== DIM_COLOR) {
                        edge.attr.original_color = edge.color;
                    }
                    var sourceId = edge.source;
                    var targetId = edge.target;

                    if (targetNodes[sourceId] === undefined || targetNodes[targetId] === undefined) {
                        // Not on the path.  DIM all of those.
                        if (!edge.attr.grey) {
                            edge.color = DIM_COLOR;
                            edge.attr.grey = true;
                        }
                    } else if (edge.label === "extra") {
                        edge.color = "rgba(255,94,25,0.7)";
                        edge.attr.grey = false;
                    } else {
                        edge.color = SELECTED_NODE_COLOR;
                        edge.attr.grey = false;
                    }
                });
            } else {
                SIGMA_RENDERER.iterEdges(function (edge) {
                    if (edge.color !== SELECTED_NODE_COLOR && edge.color !== DIM_COLOR) {
                        edge.attr.original_color = edge.color;
                    }

                    edge.color = DIM_COLOR;
                    edge.attr.grey = true;

                });
            }

            SIGMA_RENDERER.iterNodes(function (node) {
                if (node.color !== SELECTED_NODE_COLOR && node.color !== DIM_COLOR
                    && node.color !== QUERY_NODE_COLOR) {
                    node.attr.original_color = node.color;
                }

                if (queryNode !== undefined && node.id === queryNode) {
                    node.color = QUERY_NODE_COLOR;
                    node.attr.grey = false;
                    node.forceLabel = true;
                } else if (!targetNodes[node.id]) {
                    node.color = DIM_COLOR;
                    node.attr.grey = true;
                    node.forceLabel = false;
                } else {
                    node.color = SELECTED_NODE_COLOR;
                    node.attr.grey = false;
                    node.forceLabel = true;
                }
            }).draw(2, 2, 2);
        }
    });


    // Application configuration
    var NexoAppModel = Backbone.Model.extend({

        initialize: function () {
            var self = this;
            $.getJSON(self.get("settingFileLocation"), function (configObject) {
                self.set("appConfig", configObject);
                var networkManager = new Networks();
                self.set("networkManager", networkManager);

                // Load networks
                self.loadNetworkSettings();

                // Fire event: Application is ready to use.
                self.trigger(INITIALIZED);
            });
        },

        loadNetworkSettings: function () {
            var networks = this.get("appConfig").networks;

            var nexoTree = {};
            for (var i = 0; i < networks.length; i++) {
                var network = networks[i];
                var tree = {};
                if (network.name === DEFAULT_NETWORK) {

                    tree = new Network({name: network.name, config: network, loadAtInit: true});
                    nexoTree = tree;
                } else {

                    tree = new Network({name: network.name, config: network, loadAtInit: false});
                }
                this.get("networkManager").add(tree);
            }

            // Initialize NeXO view only.
            $("#network-title").html(nexoTree.get("name"));
            var nexoView = new NetworkView({model: nexoTree});
            VIEW_MANAGER.addNetworkView(nexoTree.get("name"), nexoView);

            // Set current
            this.set("currentNetwork", nexoTree);
            this.set("currentNetworkView", nexoView);
        },

        loadNetworkDataFile: function (targetNetwork) {

            console.log(targetNetwork);
            var network = targetNetwork[0];
            var networkName = network.get("name");
            console.log("GOT Network Selected ===> " + networkName);
            var networkView = VIEW_MANAGER.getNetworkView(networkName);

            console.log(networkView);

            network.loadNetworkData();
            if (networkView === undefined || networkView === null) {
                console.log("Need to create view ===> " + networkName);
                networkView = new NetworkView({model: network});
                VIEW_MANAGER.addNetworkView(networkName, networkView);
            }

            networkView.render();

            $("#network-title").html(networkName);

            // Set current
            this.set("currentNetwork", network);
            this.set({currentNetworkView: networkView});
        }
    });


    // Bootstrapping the app
    var Nexo = Backbone.View.extend({

        el: "body",

        initialize: function () {
            var self = this;
            this.model = new NexoAppModel({settingFileLocation: CONFIG_FILE});

            // Initialize sub components of this view
            var searchView = new SearchResultTableView({el: $(ID_SEARCH_RESULTS)});
            var summaryView = new NodeDetailsView();
            var subNetworkView = new CyNetworkView();

            this.model.set({
                searchView: searchView,
                summaryView: summaryView,
                subNetworkView: subNetworkView
            });

            this.listenToOnce(this.model, INITIALIZED, function () {

                var currentNetworkView = self.model.get("currentNetworkView");

                viewEventHelper.listenTo(searchView.collection, NODES_SELECTED, _.bind(currentNetworkView.selectNodes, currentNetworkView));
                viewEventHelper.listenTo(searchView.collection, SEARCH_RESULT_SELECTED, _.bind(currentNetworkView.zoomTo, currentNetworkView));

                viewEventHelper.listenTo(currentNetworkView, NODE_SELECTED, _.bind(summaryView.show, summaryView));
                viewEventHelper.listenTo(currentNetworkView, NODE_SELECTED, _.bind(summaryView.model.getDetails, summaryView.model));

                // Update subnetwork view when a term is selected.
                viewEventHelper.listenTo(currentNetworkView, NODE_SELECTED, _.bind(subNetworkView.update, subNetworkView));

                viewEventHelper.listenTo(searchView, CLEAR, _.bind(currentNetworkView.refresh, currentNetworkView));

                eventHelper.listenTo(searchView, CLEAR, _.bind(summaryView.hide, summaryView));

                // Network collection manager
                var networkCollection = self.model.get("networkManager");
                var networkManagerView = new NetworkManagerView({collection: networkCollection});
                eventHelper.listenTo(networkCollection, NETWORK_SELECTED, _.bind(self.model.loadNetworkDataFile, self.model));

                // Listening to the current network view change event.
                self.listenTo(self.model, "change:currentNetworkView", self.networkViewSwitched);
                eventHelper.listenTo(self.model, "change:currentNetworkView", _.bind(searchView.currentNetworkChanged, searchView));

                // For interactions
                eventHelper.listenTo(eventHelper, "subnetworkRendered", _.bind(summaryView.interactionRenderer, summaryView));

                console.log(self);
            });
        },

        networkViewSwitched: function () {
            var currentNetworkView = this.model.get("currentNetworkView");
            currentNetworkView.fit();
            this.updateListeners(currentNetworkView);
        },

        updateListeners: function (currentNetworkView) {
            var summaryView = this.model.get("summaryView");
            var subNetworkView = this.model.get("subNetworkView");
            var searchView = this.model.get("searchView");

            viewEventHelper.stopListening();

            viewEventHelper.listenTo(searchView.collection, NODES_SELECTED, _.bind(currentNetworkView.selectNodes, currentNetworkView));
            viewEventHelper.listenTo(searchView.collection, SEARCH_RESULT_SELECTED, _.bind(currentNetworkView.zoomTo, currentNetworkView));

            viewEventHelper.listenTo(currentNetworkView, NODE_SELECTED, _.bind(summaryView.show, summaryView));
            viewEventHelper.listenTo(currentNetworkView, NODE_SELECTED, _.bind(summaryView.model.getDetails, summaryView.model));

            // Update subnetwork view when a term is selected.
            viewEventHelper.listenTo(currentNetworkView, NODE_SELECTED, _.bind(subNetworkView.update, subNetworkView));
            viewEventHelper.listenTo(searchView, CLEAR, _.bind(currentNetworkView.refresh, currentNetworkView));
        }

    });

    var SearchResultModel = Backbone.Model.extend({

    });
    var SearchResults = Backbone.Collection.extend({

        comparator: function (model) {
            return model.get("id");
        }
    });
    /*
     A row in the search result table.
     */
    var SearchView = Backbone.View.extend({

        render: function (query) {
            var self = this;

            var name = this.model.get("name");
            var label = this.model.get("label");
            var hits = {};
            _.each(this.model.keys(), function (key) {
                var value = self.model.get(key);
                if (value !== undefined && value !== "" && key !== "label") {
                    _.each(query, function (qVal) {
                        var original = value.toString();
                        var newValue = original.toLocaleLowerCase();
                        var location = newValue.indexOf(qVal.toLowerCase());
                        if (location !== -1) {
                            var len = original.length;
                            var start = 0;
                            var last = len;

                            if (location > 20) {
                                start = location - 20;
                            }

                            if (len - location > 20) {
                                last = location + 20;
                            }

                            var finalText = "";
                            if (start !== 0) {
                                finalText += "... ";
                            }

                            finalText += original.substring(start, last);

                            if (last != len) {
                                finalText += "..."
                            }

                            hits[key] = finalText;
                        }
                    });
//                    console.log(hits);
//                    console.log(query);
                }
            });


            var newRow = "<tr><td>" + name + "</td><td>" + label + "</td><td style='width: 190px'><ul>";
            _.each(_.keys(hits), function (key) {
                newRow += "<li>" + hits[key] + "</li>";
            });

            newRow += "</ul></td></tr>";
            this.$el.append(newRow);
            return this;
        }
    });


    /*
     Search result table
     */
    var SearchResultTableView = Backbone.View.extend({

        el: ID_SEARCH_RESULTS,

        isDisplay: false,

        nameSpace: "NEXO",

        events: {
            "click #search-button": "searchButtonPressed",
            "click #clear-button": "clearButtonPressed",
            "click #help-button": "helpButtonPressed",
            "keypress #query": "searchDatabase",
            "click .radio": "searchModeChanged"
        },

        initialize: function () {
            var self = this;

            this.collection = new SearchResults();
            var tableObject = $("#result-table");
            tableObject.find("tr").live("click", function () {
                tableObject.find("tr").each(function () {
                    $(this).removeClass("selected");
                });
                $(this).addClass("selected");
                var id = $(this).children("td")[0].firstChild.nodeValue;
                self.collection.trigger(SEARCH_RESULT_SELECTED, id);
            });

            tableObject.hide();
        },

        searchModeChanged: function (mode) {
            console.log(mode);
        },

        currentNetworkChanged: function (e) {
            var networkName = e.get("currentNetwork").get("name");
            var parts = networkName.split(" ");
            var nameSpace = parts[0].toUpperCase();
            console.log("Current Namespace = " + nameSpace);
            this.nameSpace = nameSpace;

        },


        render: function () {
            var resultTableElement = $("#result-table");
            resultTableElement.empty();

            console.log("Rendering table: " + this.collection.size());
            if (this.collection.size() === 0) {
                this.$("#result-table").append(
                    "<tr><td>" + "No Match!" + "</td></tr>").slideDown(1000, "swing");
                return;
            }

            var queryObject = this.collection.at(0);

            // This should not happen!
            if (queryObject === undefined) {
                return;
            }

            var queryArray = queryObject.get("queryArray");

            // Check existing nodes
            var nodeMap = {};
            SIGMA_RENDERER
                .iterNodes(function (node) {
                    nodeMap[node.id] = true;
                });


            this.$("#result-table").append("<tr><th>ID</th><th>Term Name</th><th>Matches</th></tr>");
            this.collection.each(function (result) {
                var name = result.get("name");
                if (result !== queryObject && nodeMap[name]) {
                    this.renderResult(result, queryArray);
                }
            }, this);

            this.$("#result-table").show(600);

            if (this.isDisplay === false) {
                this.$el.animate({width: '+=150px'}, 'slow', 'swing');
                this.isDisplay = true;
            }
        },

        renderResult: function (result, query) {

            var resultView = new SearchView({
                model: result
            });

            var rendered = resultView.render(query);
            $("#result-table").append(rendered.$el.html());

        },

        search: function (query, searchByGenes) {
            var self = this;

            this.collection.reset();

            var searchUrl = "";
            if (searchByGenes) {
                searchUrl = "/search/genes/" + query;
            } else {
                searchUrl = "/search/" + this.nameSpace + "/" + query;
            }

            console.log("NS = " + this.nameSpace);

            $.getJSON(searchUrl, function (searchResult) {
                if (searchResult !== undefined && searchResult.length !== 0) {
                    self.filter(searchResult, self);
                    self.collection.trigger(NODES_SELECTED, self.collection.models);
                }

                self.render();
            });
        },

        filter: function (results, self) {
            var keySet = [];
            _.each(results, function (result) {
                var name = result.name;
                if (!_.contains(keySet, name)) {
                    self.collection.add(result);
                }
                keySet.push(name);
            });
        },

        searchDatabase: function (event) {
            var charCode = event.charCode;

            // Enter key
            if (charCode === 13) {
                var byGenes = $("#byGenes")[0].checked;
                event.preventDefault();
                var query = $("#query").val();
                this.search(query, byGenes);
            }
        },

        searchButtonPressed: function () {
            var originalQuery = $("#query").val();
            var byGenes = $("#byGenes")[0].checked;

            // Ignore empty
            if (!originalQuery || originalQuery === "") {
                return;
            }
            // Validate input
            this.search(originalQuery, byGenes);
        },

        clearButtonPressed: function () {
            var resultTableElement = $("#result-table");

            if (this.isDisplay) {
                this.$el.animate({width: '-=150px'}, 'slow', 'swing');
                this.isDisplay = false;
            }
            resultTableElement.slideUp(500).empty();
            $("#query").val("");
            this.trigger(CLEAR);
        }
    });


    /*
     Data model for the node View.
     */
    var NodeDetails = Backbone.Model.extend({

        getDetails: function (selectedNodeId) {
            if (selectedNodeId === null || selectedNodeId === undefined) {
                //  Do nothing.
                return;
            }

            this.url = "/" + selectedNodeId;
            this.id = selectedNodeId;

            var self = this;
            this.fetch({
                success: function (data) {
                    var attr = data.attributes;
                    for (var key in attr) {
                        self.set(key, attr[key]);
                    }
                }
            });
        }
    });


    /*
     Summary view
     */
    var NodeDetailsView = Backbone.View.extend({

        el: ID_SUMMARY_PANEL,

        events: {
            "click #close-button": "hide",
            "hover #term-summary": "showHover",
            "hover #genes": "showHover",
            "hover #interactions": "showHover"
        },

        isDisplayed: false,

        initialize: function () {
            this.model = new NodeDetails();
            this.listenTo(this.model, "change", this.render);

            this.$el.find(".float-ui").hide();
        },


        showHover: function () {
            var self = this;
            clearTimeout(t);
            this.$el.find(".float-ui").fadeIn(500);

            var t = setTimeout(function () {
                self.$el.find(".float-ui").fadeOut(500);
            }, 2000);
        },

        render: function () {

            this.$(ID_NODE_DETAILS).empty();
            this.$("#genes").empty();

            var entryId = this.model.get("name");
            if (entryId.indexOf("GO") === -1) {
                this.nexoRenderer(entryId);
            } else {
                // Interaction is not available for GO
                $("#interactions").empty();
                this.goRenderer(entryId);
            }

            return this;
        },

        interactionRenderer: function (graph) {
            var edges = graph.elements.edges;

            var itrPanel = this.$("#interactions");
            itrPanel.empty();

            var summary = "<table class='table table-striped'>";
            _.each(edges, function (edge) {
                var source = edge.data.source;
                var target = edge.data.target;
                var itr = edge.data.interaction;
                summary += "<tr><td>" + source + "</td><td>" + itr + "</td><td>" + target + "</td></tr>";
            });
            summary += "</table>";
            itrPanel.append(summary);
        },

        /*
         * Render term details for GO
         */
        goRenderer: function (id) {
            var label = this.model.get("term name");
            var description = this.model.get("def");
            var synonym = this.model.get("synonym");
            var comment = this.model.get("comment");

            this.renderGenes();

            this.$("#subnetwork-view").hide();
            this.$(".headertext").empty().append(label);

            var summary = "<h4><a href='" + QUICK_GO_API + id + "' target=_blank >" + id + "</a></h4>";
            summary += "<table class=\"table table-striped\"><tr><td>Description</td><td>" + description + "</td></tr>";
            summary += "<tr><td>Synonym</td><td>" + synonym + "</td></tr>";
            summary += "<tr><td>Comment</td><td>" + comment + "</td></tr>";
            summary += "</table>";

            this.$(ID_NODE_DETAILS).append(summary);
//            this.$(ID_NODE_DETAILS).append("<div id='term-view'></div>");
        },

        renderGenes: function () {
            var genes = this.model.get("Assigned Gene Ids");
            if (genes === undefined || genes.length > 100) {
                // Too many genes.
                return;
            }

            if (genes !== undefined && genes.length !== 0) {
                genes = _.uniq(genes);

                var names = "";
                _.each(genes, function (gene) {
                    names += gene + " ";
                });

                // TODO set upper limit.
                $.getJSON("/search/names/" + names, null, function (list) {
                    var rows = {};
                    var geneNames = [];

                    var genesTab = $("#genes");
                    var table = "<table class=\"table table-striped\">" +
                        "<tr><th>SGD ID</th><th>Gene Symbol</th><th>ORF</th></tr>";

                    _.each(list, function (gene) {
                        var symbol = gene["Assigned Genes"];
                        geneNames.push(symbol);
                        rows[symbol] = "<tr><td>" + gene.name + "</td><td><a href='" + SGD_API + gene.name +
                            "' target=_blank>" + symbol + "</a></td><td>"
                            + gene["Assigned Orfs"] + "</td></tr>";
                    });

                    geneNames = geneNames.sort();
                    _.each(geneNames, function (geneName) {
                        table += rows[geneName];
                    });
                    table += "</table>";
                    genesTab.append(table);

                });
            }
        },

        nexoRenderer: function (id) {

            // Use CC Annotation as label, if not available, use ID.
            var label = this.model.get("CC Annotation");
            if (label === undefined || label === null || label === "") {
                label = id;
            }

            // Main title
            this.$(".headertext").empty().append(label);

            // Render raw interaction network view
            this.$("#subnetwork-view").show();

            // Setup summary table
            this.$(ID_NODE_DETAILS).append("<div id='term-summary'></div>");

            var bestAlignedGoCategory = this.model.get("Best Alignment Ontology");
            var alignedCategory = "-";
            var category = "";
            if (bestAlignedGoCategory !== "" && bestAlignedGoCategory !== null && bestAlignedGoCategory !== "None") {
                alignedCategory = CATEGORY_MAP[bestAlignedGoCategory];
                category = bestAlignedGoCategory.toUpperCase();
            }
            var alignedGo = this.model.get("Best Alignment GO Term ID");
            var alignedGoTermName = this.model.get("Term");
            var robustness = this.model.get("Robustness");
            var interactionDensity = this.model.get("Interaction Density");
            var bootstrap = this.model.get("Bootstrap");

            // Render Summary Table

            var summary = "<h4>Unique Term ID: " + id + "</h4><div id='robustness'></div>";

            if (id.indexOf("S") === -1) {
                summary += "<h4>Gene Ontology Alignment</h4><table class='table table-striped'>";
                summary += "<tr><td>Best Aligned GO Term ID</td><td>" + alignedGo + "</td></tr>";
                summary += "<tr><td>Best Aligned GO Term Name</td><td>" + alignedGoTermName + "</td></tr>";
                summary += "<tr><td>Best Aligned GO Gategory</td><td>";
                summary += alignedCategory + "</td></tr></table></div><div id='go-chart'></div>";
                summary = this.processEntry(summary);


                this.renderGenes();
            } else {
                summary = this.processGeneEntry(summary);
            }
            summary += "</table>";


            this.$("#term-summary").append(summary);

            if (id.indexOf("S") === -1) {
                this.renderSingleValueChart(0, 25,
                    [Math.round(robustness * 100) / 100,
                        Math.round(bootstrap * 100) / 100,
                        Math.round(interactionDensity * 100) / 100],
                    "Term Scores", ["Robustness", "Bootstrap", "Interaction Density"], $("#robustness"));
                this.renderScores();
            }
        },

        renderSingleValueChart: function (min, max, valueArray, title, categoryArray, domElement) {

            domElement.highcharts({
                colors: [
                    '#52A2C5',
                    '#2B7A9B',
                    '#FF5E19',
                    '#80699B',
                    '#3D96AE',
                    '#DB843D',
                    '#92A8CD',
                    '#A47D7C',
                    '#B5CA92'
                ],
                chart: {
                    type: 'bar',
                    height: 220,
                    spacingBottom: 15,
                    spacingTop: 0,
                    backgroundColor: "rgba(255,255,255,0)"
                },


                title: {
                    text: null
                },
                xAxis: {
                    categories: [""],
                    labels: {
                        style: {
                            fontSize: '12px',
                            fontWeight: 700,
                            fontFamily: 'Roboto'
                        }
                    }
                },
                yAxis: [
                    {
                        min: min,
                        max: max,
                        title: {
                            text: "Term Robustness",
                            style: {
                                fontFamily: 'Roboto',
                                color: '#FF5E19'
                            }
                        },
                        labels: {
                            style: {
                                fontSize: '12px',
                                fontFamily: 'Roboto',
                                color: '#FF5E19',
                                fontWeight: 300
                            }
                        },
                        opposite: true
                    },
                    {
                        min: 0,
                        max: 1,
                        title: {
                            text: "Interaction Density & Bootstrap"
                        }
                    }
                ],
                series: [
                    {

                        yAxis: 1,
                        data: [valueArray[1]],
                        name: categoryArray[1],
                        dataLabels: {
                            enabled: true,
                            color: '#343434',
                            align: 'left',
                            x: 3,
                            y: 0,
                            style: {
                                fontWeight: 400,
                                fontSize: '12px',
                                fontFamily: 'Roboto'
                            }
                        }
                    },
                    {

                        yAxis: 1,
                        data: [valueArray[2]],
                        name: categoryArray[2],
                        dataLabels: {
                            enabled: true,
                            color: '#343434',
                            align: 'left',
                            x: 3,
                            y: 0,
                            style: {
                                fontWeight: 400,
                                fontSize: '12px',
                                fontFamily: 'Lato'
                            }
                        }
                    },
                    {

                        yAxis: 0,
                        data: [valueArray[0]],
                        name: categoryArray[0],
                        dataLabels: {
                            enabled: true,
                            color: '#FF5E19',
                            align: 'left',
                            x: 3,
                            y: 0,
                            style: {
                                fontWeight: 700,
                                fontSize: '14px',
                                fontFamily: 'Roboto'
                            }
                        }
                    }
                ],
                plotOptions: {

                    series: {
                        animation: false,
                        pointPadding: 0,
                        groupPadding: 0,
                        borderWidth: 0,
                        pointWidth: 27
                    }
                },
                credits: {
                    enabled: false
                },
                legend: {
                    enabled: true
                },
                tooltip: {
                    shared: true,
                    useHTML: true,
                    followPointer: true,
                    hideDelay: 0,
                    headerFormat: '<small>{point.key}</small><table>',
                    pointFormat: '<tr><td style="color: {series.color}">{series.name}: </td>' +
                        '<td style="text-align: right"><b>{point.y}</b></td></tr>',
                    footerFormat: '</table>'
                }
            });
        },


        renderScores: function () {
            var bp = this.model.get("BP Score");
            var cc = this.model.get("CC Score");
            var mf = this.model.get("MF Score");

            bp = Math.round(bp * 100) / 100;
            cc = Math.round(cc * 100) / 100;
            mf = Math.round(mf * 100) / 100;

            $("#go-chart").highcharts({
                chart: {
                    type: 'bar',
                    animation: false,
                    height: 150,
                    spacingBottom: 15,
                    spacingTop: 0,
                    backgroundColor: "rgba(255,255,255,0)"
                },

                title: {
                    text: null
                },
                xAxis: {
                    categories: ['Biological Process', 'Cellular Component', 'Molecular Function'],
                    labels: {
                        style: {
                            fontSize: '12px',
                            fontWeight: 300,
                            fontFamily: 'Roboto'
                        }
                    }
                },
                yAxis: {
                    min: 0,
                    max: 1.0,
                    title: {
                        text: null
                    }
                },
                series: [
                    {
                        data: [bp, cc, mf],
                        dataLabels: {
                            enabled: true,
                            color: '#343434',
                            align: 'right',
                            x: 40,
                            y: 0,
                            style: {
                                fontSize: '12px',
                                fontWeight: 700,
                                fontFamily: 'Roboto'
                            }
                        }
                    }
                ],
                plotOptions: {
                    series: {
                        animation: false,
                        pointPadding: 0,
                        groupPadding: 0,
                        borderWidth: 0,
                        pointWidth: 27
                    }
                },
                credits: {
                    enabled: false
                },
                legend: {
                    enabled: false
                }
            });
        },

        processEntry: function (allValues) {

            for (var tableKey in TARGETS) {
                var tableValue = this.model.get(tableKey);
                if (tableValue === null || tableValue === "" || tableValue === undefined) {
                    tableValue = EMPTY_RECORD;
                }

                if (tableKey === "Best Alignment GO Term ID" && tableValue !== EMPTY_RECORD) {
                    tableValue = "<a href='" + QUICK_GO_API + tableValue + "' target='_blank'>" + tableValue + "</a>";
                }

                if (tableKey === "Biological Process" || tableKey === "Cellular Component" || tableKey === "Molecular Function") {
                    allValues += "</table><h4>" + tableKey + "</h4><table class=\"table table-striped\">";
                } else {
                    allValues += "<tr><td style='width: 120px'>" + TARGETS[tableKey] + "</td><td>" + tableValue + "</td></tr>";
                }
            }

            return allValues;
        },

        processGeneEntry: function (allValues) {

            allValues += "<table class=\"table table-striped\">";
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
        },

        show: function () {
            var self = this;
            this.$el.show(400, "swing", function () {
                if (!self.isDisplayed) {
                    var newWidth = $(document).width() - 550;
                    SIGMA_RENDERER.resize(newWidth, $(document).height()).draw();
                    SIGMA_RENDERER.position(0, 0, 1).draw();
                    self.isDisplayed = true;
                }
            });
        },

        hide: function () {
            var self = this;
            this.$el.hide(400, "swing", function () {
                SIGMA_RENDERER.resize($(document).width(), $(document).height()).draw();
                SIGMA_RENDERER.position(0, 0, 1).draw();
                self.isDisplayed = false;
            });
        }
    });

    ////////////////// Start App /////////////////////////////////
    var app = new Nexo();

})();