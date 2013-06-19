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

    // Color for nodes that are not selected
    var DIM_COLOR = "rgba(200,200,200,0.9)";
    var SELECTED_NODE_COLOR = "rgba(70,130,180,0.9)";
    var QUERY_NODE_COLOR = "rgb(255,94,25)";

    // Tags in the HTML document
    var ID_NODE_DETAILS = "#details";
    var ID_SUMMARY_PANEL = "#summary-panel";
    var ID_SEARCH_RESULTS = "#mainpanel";

    var DEFAULT_NETWORK = "NeXO";

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

    var SIGMA_RENDERER = sigma.init(document.getElementById("sigma-canvas"));


    /**
     * Manager object for network views.
     *
     * @constructor
     */
    var NetworkViewManager = function () {
        this.views = {};
    };
    NetworkViewManager.prototype = {
        getNetworkView: function (viewId) {
            return this.views[viewId];
        },

        addNetworkView: function (viewId, view) {
            this.views[viewId] = view;
        }
    };

    var VIEW_MANAGER = new NetworkViewManager();


    var CyNetwork = Backbone.Model.extend({

        initialize: function () {
            this.url = "/" + this.get("namespace") + "/" + this.get("termId") + "/interactions";
            console.log("URL = " + this.url);
        }
    });


    /*
     Sub-network view by cytoscape.js
     */
    var CyNetworkView = Backbone.View.extend({

        el: "#cy-network",

        model: CyNetwork,

        events: {},

        initialize: function () {
            console.log("CyNetworkview initialized.  This should be called only once.");
        },

        update: function (nodeId) {
            // TODO: remove dependency!
            // check current network model:
            var currentNetwork = app.model.get("currentNetwork");
            var currentNetworkName = currentNetwork.get("name");
            if (currentNetworkName !== DEFAULT_NETWORK) {
                // No need to update
                return;
            }

            var self = this;

            this.model = new CyNetwork({namespace: "nexo", termId: nodeId});

            var options = this.model.get("options");

            if (options === null || options === undefined) {
                this.model.set("options", this.initSubnetworkView());
            }
            console.log("Rendering ================ CyNetworkview");

            this.model.fetch({
                success: function (data) {

                    var graph = data.attributes.graph;
                    console.log(graph);
                    var cyObj = self.model.get("cy");
                    console.log(cyObj);
                    cyObj.load(graph.elements,
                        cyObj.layout({
                            name: 'arbor',
                            liveUpdate: true, // whether to show the layout as it's running
                            maxSimulationTime: 5000, // max length in ms to run the layout
                            fit: true, // fit to viewport
                            padding: [ 30, 30, 30, 30 ], // top, right, bottom, left
                            ungrabifyWhileSimulating: true, // so you can't drag nodes during layout

                            // forces used by arbor (use arbor default on undefined)
                            repulsion: 9800,
                            stiffness: 1500,
                            friction: 0.8,
                            gravity: true,
                            fps: undefined,
                            precision: undefined,

                            // static numbers or functions that dynamically return what these
                            // values should be for each element
                            nodeMass: 5000,
                            edgeLength: 0.5,

                            stepSize: 1, // size of timestep in simulation

                            // function that returns true if the system is stable to indicate
                            // that the layout can be stopped
                            stableEnergy: function (energy) {
                                var e = energy;
                                return (e.max <= 0.5) || (e.mean <= 0.3);
                            }
                        }), function () {
                            console.log("DONE!!!!!!!!!");
                        });
                }
            });

        },

        initSubnetworkView: function () {
            console.log("Initialize");
            var self = this;

            var options = {
                showOverlay: false,
                boxSelectionEnabled: false,
                minZoom: 0.1,
                maxZoom: 3,

                style: cytoscape.stylesheet()
                    .selector('node')
                    .css({
                        'font-family': 'Exo',
                        'font-size': 11,
                        'font-weight': 300,
                        'content': 'data(id)',
                        'text-valign': 'center',
                        'color': 'rgba(250, 250, 250, 1)',
                        'width': 60,
                        'height': 20,
                        'border-color': 'white',
                        "background-color": "rgb(67,135,233)",
                        "background-opacity": 0.8,
                        "shape": "ellipse"
                    })
                    .selector(':selected')
                    .css({
                        'background-color': '#400000',
                        'line-color': '#000'
                    })
                    .selector('edge')
                    .css({
                        'width': 0.7,
                        "line-color": "#cccccc",
                        "opacity": 0.5
                    }),

                elements: {
                    nodes: [],
                    edges: []
                },

                ready: function () {
                    var cy = this;
                    self.model.set("cy", cy);
                }
            };

            $("#cyjs").cytoscape(options);
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
            for (var idx = 0; idx < numberOfNodes; idx++) {
                var id = nodes[idx].id;
                SIGMA_RENDERER.addNode(id, nodes[idx]);
            }

            var numberOfEdges = edges.length;
            for (idx = 0; idx < numberOfEdges; idx++) {
                var originalEdge = edges[idx];

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
                SIGMA_RENDERER.addEdge(edgeId, source, target, edge);
            }

            // Save the data to model
            graph.nodes = nodes;
            graph.edges = edges;
            this.set({graph: graph});
        }
    });


    var Networks = Backbone.Collection.extend({
        model: Network

    });

    var NetworkManagerView = Backbone.View.extend({
        el: "#networkSelector",

        events: {
            "click .networkName": "networkSelected"
        },

        collection: Networks,

        initialize: function () {
            this.render();
        },

        render: function () {
            var trees = $("#trees");
            trees.empty();

            var listString = "";
            var treeCount = this.collection.length;
            console.log("rendering modal window================== " + treeCount);
            for (var i = 0; i < treeCount; i++) {
                var network = this.collection.at(i);
                var networkName = network.get("config").name;
                console.log(networkName);
                listString += "<li class='networkName'>" + networkName + "</li>";
            }

            trees.append(listString);
        },

        networkSelected: function (e) {
            var selectedNetworkName = e.currentTarget.textContent;
            console.log("@@@@@@@@Network Selected ===> " + selectedNetworkName);
            var selectedNetwork = this.collection.where({name: selectedNetworkName});
            this.collection.trigger(NETWORK_SELECTED, selectedNetwork);
        }
    });


    var NetworkView = Backbone.View.extend({

        model: Network,

        el: "#sigma-canvas",

        events: {
            "dblclick": "refresh"
        },

        initialize: function () {
            var self = this;

            SIGMA_RENDERER.bind("upnodes", function (nodes) {

                var selectedNodeId = nodes.content[0];
                var selectedNode = SIGMA_RENDERER._core.graph.nodesIndex[selectedNodeId];

                // Fire nodeSelected event.
                self.trigger(NODE_SELECTED, selectedNodeId);

                self.findPath(SIGMA_RENDERER, selectedNode);
            });

            self.bindCommands();

            // Render the network once its model is ready.
            eventHelper.listenTo(this.model, NETWORK_LOADED, _.bind(this.rebuildView, this));
        },

        render: function () {
            console.log("Refreshing2");

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

        rebuildView: function () {

            console.log("Refreshing==========");
            this.render();
        },


        selectNodes: function (selectedNodes) {

            var targetNodes = [];
            for (var i = 0; i < selectedNodes.length; i++) {
                var id = selectedNodes[i].id;
                var sigmaNode = SIGMA_RENDERER._core.graph.nodesIndex[id];
                if (sigmaNode !== null) {
                    targetNodes[sigmaNode.id] = true;
                }
            }

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
            var sigmaView = SIGMA_RENDERER;
            var node = sigmaView._core.graph.nodesIndex[id];
            node.original_color = node.color;
            node.color = "red";
            sigmaView.position(0, 0, 1).draw();
            sigmaView.zoomTo(node['displayX'], node['displayY'], 20);
            sigmaView.draw(2, 2, 2);
            this.model.set("lastSelected", node);
        },


        bindCommands: function () {
            var self = this;
            var sigmaView = SIGMA_RENDERER;
            var commands = $("#commands");

            commands.find("div.z").each(function () {

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

            commands.find("div.s").each(function () {

                var button = $(this);
                var command = button.attr("rel");

                button.popover({ placement: 'top', trigger: 'hover'});

                if (command === "swap") {
                    button.hover(function () {
                        button.attr("data-content", "NeXO Tree");
                    });
                    button.click(function () {
                        console.log("Update called");
                    });
                } else if (command === "refresh") {
                    button.click(function () {
                        console.log("Refresh called");
                        self.refresh();
                    });
                }

            });
        },


        findPath: function (sigmaView, selectedNode) {
            var self = this;
            var nodeId = selectedNode.id;
            var parts = nodeId.split(":");

            console.log("len = " + parts.length + ": query0 = " + parts[0]);
            var url = "";

            if (parts.length == 1) {
                url = "/nexo/" + nodeId + "/path.json";
            } else {
                url = "/" + parts[0] + "/" + parts[1] + "/path.json";
            }
            console.log("PATH query = " + url);
            $.getJSON(url, function (path) {
                self.showPath(sigmaView, path);
            });
        },


        showAdditionalParents: function (sigmaView, targetNodes, node) {

            var parentIds = [];

            var queryUrl = "/nexo/" + node.id + "/parents";
            console.log("Parent query = " + queryUrl);

            $.getJSON(queryUrl, function (parents) {
                if (parents !== null && parents.length !== 0) {

                    console.log("Result = " + JSON.stringify(parents));
                    for (var i = 0; i < parents.length; i++) {
                        var parent = parents[i];

                        targetNodes[parent.name] = true;
                    }
                    this.highlight(sigmaView, targetNodes);
                }
            });
        },


        showPath: function (sigmaView, path) {

            if (path.elements === undefined) {
                return;
            }
            var pathNodes = path.elements.nodes;

            // Boolean map for enable/disable nodes.
            var targetNodes = {};

            var startNode = {};
            for (var i = 0; i < pathNodes.length; i++) {
                var cytoscapejsNode = pathNodes[i];
                var id = cytoscapejsNode.data.id;
                var nodeType = cytoscapejsNode.data.type;
                var sigmaNode = sigmaView._core.graph.nodesIndex[id];
                if (sigmaNode !== null && sigmaNode !== undefined) {
                    targetNodes[sigmaNode.id] = true;
                    if (nodeType === "start") {
                        startNode = sigmaNode;
                        console.log("*********** START: " + id);
                    }
                }
            }
            this.highlight(targetNodes, false, startNode);
        },


        refresh: function () {
            var sigmaView = SIGMA_RENDERER;

            sigmaView
                .iterEdges(function (edge) {
                    edge.color = edge.attr.original_color;
                    edge.attr.grey = false;
                })
                .iterNodes(function (node) {
                    node.color = node.attr.original_color;
                    node.attr.grey = false;
                    node.forceLabel = false;
                }).draw(2, 2, 2);
        },

        highlight: function (targetNodes, nodesOnly, queryNode) {

            var sigmaView = SIGMA_RENDERER;

            console.log(queryNode);

            if (nodesOnly === false) {
                sigmaView.iterEdges(function (edge) {
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
                    } else {
                        edge.color = SELECTED_NODE_COLOR;
                        edge.attr.grey = false;
                    }
                });
            } else {
                sigmaView.iterEdges(function (edge) {
                    if (edge.color !== SELECTED_NODE_COLOR && edge.color !== DIM_COLOR) {
                        edge.attr.original_color = edge.color;
                    }

                    edge.color = DIM_COLOR;
                    edge.attr.grey = true;

                });
            }

            sigmaView.iterNodes(function (node) {
                if (node.color !== SELECTED_NODE_COLOR && node.color !== DIM_COLOR
                    && node.color !== QUERY_NODE_COLOR) {
                    node.attr.original_color = node.color;
                }

                if (node.id === queryNode.id) {
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

                // Network collection manager
                var networkCollection = self.model.get("networkManager");
                var networkManagerView = new NetworkManagerView({collection: networkCollection});
                eventHelper.listenTo(networkCollection, NETWORK_SELECTED, _.bind(self.model.loadNetworkDataFile, self.model));

                // Listening to the current network view change event.
                self.listenTo(self.model, "change:currentNetworkView", self.networkViewSwitched);
                console.log(self);
            });


        },

        networkViewSwitched: function () {

            var currentNetworkView = this.model.get("currentNetworkView");
            console.log("############## App model changed. model = ");
            console.log(currentNetworkView);

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
        }

    });


    /*
     A row in the search result table.
     */
    var SearchView = Backbone.View.extend({
        model: NodeDetails,

        render: function () {
            this.$el.append("<tr><td>" + this.model.get("id") + "</td><td>" + this.model.get("label") + "</td></tr>");
            return this;
        }
    });


    /*
     Search result table
     */
    var SearchResultTableView = Backbone.View.extend({

        el: ID_SEARCH_RESULTS,

        collection: NodeDetailsList,

        events: {
            "click #search-button": "searchButtonPressed",
            "keypress #query": "searchDatabase"
        },

        initialize: function () {
            this.collection = new NodeDetailsList();
            $("#result-table").hide();
        },

        render: function () {
            var self = this;
            var resultTableElement = $("#result-table");
            resultTableElement.empty();
            console.log("Removing DONE!!");

            $("#result-table tr").live("click", function () {
                var id = $(this).children("td")[0].firstChild.nodeValue;
                self.collection.trigger(SEARCH_RESULT_SELECTED, id);
            });

            this.collection.each(function (result) {
                this.renderResult(result);
            }, this);
        },

        renderResult: function (result) {
            var resultView = new SearchView({
                model: result
            });

            var rendered = resultView.render();
            $("#result-table").append(rendered.$el.html()).fadeIn(1000);
        },

        search: function (query) {
            var self = this;

            this.collection.reset();

            $.getJSON("/search/" + query, function (searchResult) {
                if (searchResult !== null && searchResult.length !== 0) {

                    for (var i = 0; i < searchResult.length; i++) {
                        var node = searchResult[i];

                        var newNode = new NodeDetails();
                        newNode.set("id", node.name);
                        newNode.set("label", node.Term);
                        self.collection.add(newNode);
                    }

                    self.collection.trigger(NODES_SELECTED, self.collection.models);

                    self.render();
                }
            });
        },

        searchDatabase: function (event) {
            var charCode = event.charCode;

            // Enter key
            if (charCode === 13) {
                event.preventDefault();
                var query = this.parseQuery($("#query").val());
                this.search(query);
            }
        },

        searchButtonPressed: function () {
            var originalQuery = $("#query").val();

            // Ignore empty
            if (!originalQuery || originalQuery === "") {
                return;
            }

            // Validate input
            this.search(this.parseQuery(originalQuery));

        },

        parseQuery: function (query) {
            // Check it contains multiple words or not
            var entries = query.split(" ");

            var newQuery = "";
            for (var i = 0; i < entries.length; i++) {
                if (i != entries.length - 1) {
                    newQuery += "*" + entries[i] + "* OR ";
                } else {
                    newQuery += "*" + entries[i] + "*";
                }
            }
            return newQuery;
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

            var namespace = "nexo";
            var checkNamespace = selectedNodeId.split(":");
            console.log("len - " + checkNamespace.length);
            var size = checkNamespace.length;

            if (size === 1) {
                this.url = "/" + namespace + "/" + selectedNodeId;
                this.id = selectedNodeId;
            } else if (size === 2) {
                this.url = "/" + checkNamespace[0].toLowerCase() + "/" + checkNamespace[1];
                this.id = checkNamespace[1];
                namespace = checkNamespace[0];
            } else {
               console.log("ERROR!!!!!!!!");
            }


            var self = this;
            console.log(selectedNodeId + ": ******************DETAILS called: " + this.url);
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
            "click #close-button": "hide"
        },

        initialize: function () {
            this.model = new NodeDetails();
            this.listenTo(this.model, "change", this.render);
        },


        /*
         * Render term details for GO
         */
        goRenderer: function (id) {

            console.log("GO rendering: " + id);

            var label = this.model.get("term name");
            var description = this.model.get("def");

            this.$("#subnetwork-view").hide();
            this.$(".headertext").empty().append(label);

            var summary = "<h3>Term ID: " + id + "</h3>";
            summary += "<h4>Description</h4><p>" + description + "</p>";
            this.$(ID_NODE_DETAILS).append(summary);
        },

        nexoRenderer: function (id) {

            console.log("--- NEXO: " +  id );

            var label = this.model.get("Term");
            this.$(".headertext").empty().append(label);
            this.$("#subnetwork-view").show();

            var bestAlignedGoCategory = this.model.get("Best Alignment Ontology");
            var alignedCategory = "-";
            var category = "";
            if (bestAlignedGoCategory !== "" && bestAlignedGoCategory !== null && bestAlignedGoCategory !== "None") {
                alignedCategory = CATEGORY_MAP[bestAlignedGoCategory];
                category = bestAlignedGoCategory.toUpperCase();
            }
            var alignedGo = this.model.get("Best Alignment GO Term ID");
            var robustness = this.model.get("Robustness");
            var interactionDensity = this.model.get("Interaction Density");
            var bootstrap = this.model.get("Bootstrap");

            var summary = "<h3>Term ID: " + id + "</h3>";

            if (id.indexOf("S") === -1) {
                summary += "<table class=\"table table-striped\">";
                summary += "<tr><td>Robustness</td><td>" + robustness + "</td></tr>";
                summary += "<tr><td>Interaction Density</td><td>" + interactionDensity + "</td></tr>";
                summary += "<tr><td>Bootstrap</td><td>" + bootstrap + "</td></tr>";
                summary += "<tr><td>Best Aligned GO</td><td>" + alignedCategory + "</td></tr>";
                summary = this.processEntry(summary);
                this.renderChart();
                this.renderGeneList(this.model.get("Assigned Genes"));
            } else {
                summary = this.processGeneEntry(summary);
            }
            summary += "</table>";

            this.$(ID_NODE_DETAILS).append(summary);

        },

        render: function () {

            console.log("--------------------> drender detail:" );

            this.$(ID_NODE_DETAILS).empty();
            this.$("#genes").empty();

            var entryId = this.model.get("name");
            if (entryId.indexOf("GO") === -1) {
                this.nexoRenderer(entryId);
            } else {
                this.goRenderer(entryId);
            }

            return this;
        },

        renderGeneList: function (geneList) {
            var genesTab = $("#genes");
            geneList = geneList.replace("[", "");
            geneList = geneList.replace("]", "");
            var genes = geneList.split(",");

            var table = "<table class=\"table table-striped\">";
            for (var i = 0; i < genes.length; i++) {
                table += "<tr><td>" + genes[i] + "</td></tr>"
            }

            table += "</table>"
            genesTab.append(table);
        },

        renderChart: function () {
            var data = [];
            var bp = this.model.get("BP Score");
            var cc = this.model.get("CC Score");
            var mf = this.model.get("MF Score");
            data.push({name: "Biological Process", score: bp});
            data.push({name: "Cellular Component", score: cc});
            data.push({name: "Molecular Function", score: mf});

            var valueLabelWidth = 170;
            var barHeight = 25; // height of one bar
            var barLabelWidth = 140; // space reserved for bar labels
            var barLabelPadding = 15; // padding between bar and bar labels (left)
            var gridLabelHeight = 18; // space reserved for gridline labels
            var gridChartOffset = 10; // space between start of grid and first bar
            var maxBarWidth = 420; // width of the bar with the max value

            var barLabel = function (d) {
                return d.name;
            };
            var barValue = function (d) {
                return parseFloat(d.score);
            };

            var yScale = d3.scale.ordinal().domain(d3.range(0, data.length)).rangeBands([0, data.length * barHeight]);
            var y = function (d, i) {
                return yScale(i);
            };
            var yText = function (d, i) {
                return y(d, i) + yScale.rangeBand() / 2;
            };
            var x = d3.scale.linear().domain([0, 1.0]).range([0, maxBarWidth]);
            var chart = d3.select(ID_NODE_DETAILS).append("svg")
                .attr('width', maxBarWidth + barLabelWidth + valueLabelWidth)
                .attr('height', gridLabelHeight + gridChartOffset + data.length * barHeight);

            var gridContainer = chart.append('g')
                .attr('transform', 'translate(' + barLabelWidth + ',' + gridLabelHeight + ')');
            gridContainer.selectAll("text").data(x.ticks(10)).enter().append("text")
                .attr("x", x)
                .attr("dy", -3)
                .attr("text-anchor", "middle")
                .text(String);

            gridContainer.selectAll("line").data(x.ticks(10)).enter().append("line")
                .attr("x1", x)
                .attr("x2", x)
                .attr("y1", 0)
                .attr("y2", yScale.rangeExtent()[1] + gridChartOffset)
                .style("stroke", "#ccc");

            var labelsContainer = chart.append('g')
                .attr('transform', 'translate(' + (barLabelWidth - barLabelPadding) + ',' + (gridLabelHeight + gridChartOffset) + ')');

            labelsContainer.selectAll('text').data(data).enter().append('text')
                .attr('y', yText)
                .attr('stroke', 'none')
                .attr('fill', 'black')
                .attr("dy", ".35em") // vertical-align: middle
                .attr('text-anchor', 'end')
                .text(barLabel);

            var barsContainer = chart.append('g')
                .attr('transform', 'translate(' + barLabelWidth + ',' + (gridLabelHeight + gridChartOffset) + ')');

            barsContainer.selectAll("rect").data(data).enter().append("rect")
                .attr('y', y)
                .attr('height', yScale.rangeBand())
                .attr('width', function (d) {
                    return x(barValue(d));
                })
                .attr('stroke', 'white')
                .attr('fill', 'steelblue');

            barsContainer.selectAll("text").data(data).enter().append("text")
                .attr("x", function (d) {
                    return x(barValue(d));
                })
                .attr("y", yText)
                .attr("dx", 3) // padding-left
                .attr("dy", ".35em") // vertical-align: middle
                .attr("text-anchor", "start") // text-align: right
                .attr("fill", "black")
                .attr("stroke", "none")
                .text(function (d) {
                    return d3.round(barValue(d), 5);
                });

            barsContainer.append("line")
                .attr("y1", -gridChartOffset)
                .attr("y2", yScale.rangeExtent()[1] + gridChartOffset)
                .style("stroke", "#000");
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
            this.$el.fadeIn(400);
        },

        hide: function () {
            this.$el.fadeOut(400);
        }
    });

    var NodeDetailsList = Backbone.Collection.extend({
        model: NodeDetails,

        comparator: function (node) {
            return node.get("name");
        }
    });

    ////////////////// Start App /////////////////////////////////
    var app = new Nexo();

})();