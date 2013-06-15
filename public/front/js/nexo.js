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
    var DIM_COLOR = "rgba(230,230,230,0.6)";
    var SELECTED_NODE_COLOR = "rgba(70,130,180,0.9)";

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


    /*
     Custom Events
     */
    var NETWORK_LOADED = "networkLoaded";
    var INITIALIZED = "initialized";
    var NODE_SELECTED = "nodeSelected";
    var NODES_SELECTED = "nodesSelected";
    var SEARCH_RESULT_SELECTED = "searchResultSelected";

    /*
     Network States
     */
    var SELECTED_NODE_ID = "selectedNodeId";


    var CyNetwork = Backbone.Model.extend({

        initialize: function () {

            this.url = "/" + this.get("namespace") + "/" + this.get("termId") + "/interactions";
            console.log("URL = " + this.url);
//            this.fetch({
//                success: function (data) {
//                    console.log("data = " + JSON.stringify(data));
//                    var attr = data.attributes;
//                }
//            });

            this.setup();
        },

        setup: function () {
            console.log("Rendering!!!!!!!!!! = ");

            var options = {
                showOverlay: true,
                minZoom: 0.5,
                maxZoom: 2,
                layout: {
                    name: "circle"
                },

                style: cytoscape.stylesheet()
                    .selector('node')
                    .css({
                        'font-family': 'Raleway',
                        'font-size': 14,
                        'text-outline-width': 3,
                        'text-outline-color': '#ffffff',
                        'text-valign': 'center',
                        'color': '#fff',
                        'width': 50,
                        'height': 50,
                        'border-color': '#fff',
                        "background-color": "#ffffff"
                    })
                    .selector(':selected')
                    .css({
                        'background-color': '#000',
                        'line-color': '#000',
                        'target-arrow-color': '#000',
                        'text-outline-color': '#000'
                    })
                    .selector('edge')
                    .css({
                        'width': 5,
                        "line-color": "white",
                        'target-arrow-shape': 'triangle'
                    }),

                elements: {
                    nodes: [
                        {
                            data: { id: 'j', name: 'Jerry', weight: 65, height: 160 }
                        },

                        {
                            data: { id: 'e', name: 'Elaine', weight: 48, height: 160 }
                        },

                        {
                            data: { id: 'k', name: 'Kramer', weight: 75, height: 160 }
                        },

                        {
                            data: { id: 'g', name: 'George', weight: 70, height: 160 }
                        }
                    ],

                    edges: [
                        { data: { source: 'j', target: 'e' } },

                        { data: { source: 'e', target: 'j' } },
                        { data: { source: 'e', target: 'k' } },

                        { data: { source: 'k', target: 'j' } },

                        { data: { source: 'g', target: 'j' } }
                    ]
                },

                ready: function () {
                    var cy = this;
                }
            };

            $('#cyjs').cytoscape(options);
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
            console.log("CyNetworkview initialized.");
        },

        show: function (nodeId) {
            this.model = new CyNetwork({namespace: "nexo", termId: nodeId});
            console.log("Rendering ================ CyNetworkview");
        }





    });


    // Network object stored as Cytoscape.js style
    var Network = Backbone.Model.extend({

        // Only for getting data from fixed file location
        urlRoot: "/front/data",

        initialize: function () {
            var self = this;

            var networkConfig = this.get("config");
            console.log("Net conf = " + networkConfig);
            this.id = networkConfig.networkData;
            var drawingProps = networkConfig.sigma.drawingProperties;
            var graphProps = networkConfig.sigma.graphProperties;
            var mouseProps = networkConfig.sigma.mouseProperties;

            this.set({renderingEngine: sigma.init(document.getElementById("sigma-canvas")).
                drawingProperties(drawingProps).
                graphProperties(graphProps).
                mouseProperties(mouseProps)});

            var sigmaView = this.get("renderingEngine");
            sigmaView.active = false;
            sigmaView.neighbors = {};
            sigmaView.detail = false;

            this.fetch({
                success: function (data) {
                    var attr = data.attributes;
                    self.convertGraph(attr.nodes, attr.edges);
                    self.trigger(NETWORK_LOADED);
                }
            });
        },

        convertGraph: function (nodes, edges) {
            var numberOfNodes = nodes.length;
            for (var idx = 0; idx < numberOfNodes; idx++) {
                var id = nodes[idx].id;
                this.get("renderingEngine").addNode(id, nodes[idx]);
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
                this.get("renderingEngine").addEdge(edgeId, source, target, edge);
            }
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

            var sigmaView = this.model.get("renderingEngine");

            sigmaView.bind("upnodes", function (nodes) {

                var selectedNodeId = nodes.content[0];
                var selectedNode = sigmaView._core.graph.nodesIndex[selectedNodeId];

                // Fire nodeSelected event.
                self.trigger(NODE_SELECTED, selectedNodeId);

                self.findPath(sigmaView, selectedNode);
            });

            self.bindCommands();

            // Render the network once its model is ready.
            eventHelper.listenToOnce(this.model, NETWORK_LOADED, _.bind(this.render, this));
        },

        render: function () {
            this.model.get("renderingEngine").draw();
        },


        selectNodes: function (selectedNodes) {

            var targetNodes = [];
            var sigmaView = this.model.get("renderingEngine");
            for (var i = 0; i < selectedNodes.length; i++) {
                var id = selectedNodes[i].id;
                var sigmaNode = sigmaView._core.graph.nodesIndex[id];
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
            var sigmaView = this.model.get("renderingEngine");
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
            var sigmaView = this.model.get("renderingEngine");
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
            var url = "/nexo/" + nodeId + "/path.json";
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

            for (var i = 0; i < pathNodes.length; i++) {
                var cytoscapejsNode = pathNodes[i];
                var id = cytoscapejsNode.data.id;
                var sigmaNode = sigmaView._core.graph.nodesIndex[id];
                if (sigmaNode !== null) {
                    targetNodes[sigmaNode.id] = true;
                }
            }
            this.highlight(targetNodes, false);
        },


        refresh: function () {
            var sigmaView = this.model.get("renderingEngine");

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

        highlight: function (targetNodes, nodesOnly) {

            var sigmaView = this.model.get("renderingEngine");

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
                if (node.color !== SELECTED_NODE_COLOR && node.color !== DIM_COLOR) {
                    node.attr.original_color = node.color;
                }

                if (!targetNodes[node.id]) {
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

                // Load networks
                self.loadNetworks();

                // Fire event: Application is ready to use.
                self.trigger(INITIALIZED);
            });
        },

        loadNetworks: function () {
            var networks = this.get("appConfig").networks;

            var nexoConfig = {};
            for (var i = 0; i < networks.length; i++) {
                var network = networks[i];
                if (network.name === DEFAULT_NETWORK) {
                    nexoConfig = network;
                    break;
                }
            }

            $("#network-title").html(nexoConfig.name);
            var nexoDag = new Network({config: nexoConfig});
            var nexoView = new NetworkView({model: nexoDag});

            // Set current
            this.set("currentNetwork", nexoDag);
            this.set("currentNetworkView", nexoView);

            this.set({nexoDagView: nexoView });
        }
    });


    // Bootstrapping the app
    var Nexo = Backbone.View.extend({
        model: NexoAppModel,

        el: "body",

        initialize: function () {
            var self = this;
            this.model = new NexoAppModel({settingFileLocation: CONFIG_FILE});

            this.listenToOnce(this.model, INITIALIZED, function () {
                console.log("App model initialized");
                var currentNetworkView = this.model.get("currentNetworkView");
                var searchView = new SearchResultTableView({el: $(ID_SEARCH_RESULTS)});
                eventHelper.listenTo(searchView.collection, NODES_SELECTED, _.bind(currentNetworkView.selectNodes, currentNetworkView));
                eventHelper.listenTo(searchView.collection, SEARCH_RESULT_SELECTED, _.bind(currentNetworkView.zoomTo, currentNetworkView));

                var summaryView = new NodeDetailsView();
                var subNetworkView = new CyNetworkView();

                eventHelper.listenTo(currentNetworkView, NODE_SELECTED, _.bind(summaryView.show, summaryView));
                eventHelper.listenTo(currentNetworkView, NODE_SELECTED, _.bind(summaryView.model.getDetails, summaryView.model));

                eventHelper.listenTo(currentNetworkView, NODE_SELECTED, _.bind(subNetworkView.show, subNetworkView));
            });
        },

        registerListeners: function () {

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

        urlRoot: "/",

        getDetails: function (selectedNodeId) {
            if (selectedNodeId === null || selectedNodeId === undefined) {
                //  Do nothing.
                return;
            }

            var checkNamespace = selectedNodeId.split(":");
            if (checkNamespace.length === 1) {
                this.urlRoot = "/nexo";
                this.id = selectedNodeId;
            } else if (checkNamespace.lenght === 2) {
                this.urlRoot = "/" + checkNamespace[0];
                this.id = checkNamespace[1];
            }

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

        model: NodeDetails,

        events: {
            "click #close-button": "hide"
        },

        initialize: function () {
            this.model = new NodeDetails();
            eventHelper.listenTo(this.model, "change", _.bind(this.render, this));
        },

        render: function () {
            this.$(ID_NODE_DETAILS).empty();
            this.$("#genes").empty();

            var label = this.model.get("Term");
            this.$(".headertext").empty().append(label);

            // Manually render summary view.
            var entryId = this.model.get("name");
            if (entryId.indexOf("GO:") != -1) {
                var summary = "<h3>Term ID: " + entryId + "</h3>";
                this.$el.html(summary).fadeIn(1000);

                return this;
            }

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

            var summary = "<h3>Term ID: " + entryId + "</h3>";

            if (entryId.indexOf("S") === -1) {
                console.log("FOUND! " + entryId);
                summary += "<table class=\"table table-striped\">";
                summary += "<tr><td>Robustness</td><td>" + robustness + "</td></tr>";
                summary += "<tr><td>Interaction Density</td><td>" + interactionDensity + "</td></tr>";
                summary += "<tr><td>Bootstrap</td><td>" + bootstrap + "</td></tr>";
                summary += "<tr><td>Best Aligned GO</td><td>" + alignedCategory + "</td></tr>";
                summary = this.processEntry(summary);
                this.renderChart();
                this.renderGeneList(this.model.get("Assigned Genes"));
            } else {
                console.log("NOT FOUND! " + entryId);
                summary = this.processGeneEntry(summary);
            }
            summary += "</table>";

            this.$(ID_NODE_DETAILS).append(summary);

            console.log("RENDERED: " + entryId);
            return this;
        },

        renderGO: function () {

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