//
// NeXO View by Keiichiro Ono
//

/* global Backbone */
/* global sigma */
/* global d3 */

(function () {
    "use strict";

    ////////////////////////////////////////////
    // Constants
    ////////////////////////////////////////////

    // Configuration file for this application
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

    // Color for nodes that are not selected
    var DIM_COLOR = "#aaaaaa";

    // IDs & classes in the HTML document
    var ID_NODE_DETAILS = "#details";

    // Search result panel
    var ID_SEARCH_RESULTS = "#mainpanel";


    /////////// For rendering ///////////////////
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


    //////////////////////////////////
    // Different view for Search results
    //////////////////////////////////

    var SearchView = Backbone.View.extend({

        render: function () {
            this.$el.append("<tr><td>" + this.model.get("id") + "</td><td>" + this.model.get("label") + "</td></tr>");
            return this;
        }
    });


    var SearchViews = Backbone.View.extend({

        events: {
          "click #search-button": "searchDatabase",
          "keypress #query": "searchDatabase"
        },

        initialize: function () {
            this.collection = new Nodes();
            $("#result-table").hide();
            console.log("Result view initialized.  EL = " + this.$el);
        },

        render: function () {
            $("#result-table").empty();

            this.collection.each(function (result) {
                this.renderResult(result);
            }, this);

        },

        renderResult: function (result) {
            var resultView = new SearchView({
                model: result
            });

            var rendered = resultView.render();
            console.log("rendered = " + rendered.$el);

            $("#result-table").append(rendered.$el.html()).fadeIn(1000);
        },

        searchDatabase: function (event) {

            var charCode = event.charCode;

            if (charCode === 13) {
                event.preventDefault();
                console.log("Start search... " + $("#query").val());

                var self = this;

                var query = this.parseQuery($("#query").val());
                $.getJSON("/search/" + query, function (searchResult) {
                    if(searchResult !== null && searchResult.length !== 0) {

                        console.log("Result = " + JSON.stringify(searchResult));
                        for(var i=0; i<searchResult.length; i++) {
                            var node = searchResult[i];

                            var newNode = new Node();
                            newNode.set("id",node.name);
                            newNode.set("label", node.Term);
                            self.collection.add(newNode);
                        }

                        self.render();
                    }
                });
            }

        },

        parseQuery: function(query) {
            // Check it contains multiple words or not

            return "*" + query +"*";
        }
    });


    var Node = Backbone.Model.extend({

        urlRoot: "/nexo",

        initialize: function () {
            console.log("Model Init called !!!!!!!!!!");
        }

    });


    var NodeView = Backbone.View.extend({


        render: function () {

            var genesTab = $("#genes").empty();

            // Manually render summary view.
            var entryId = this.model.get("name");
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

            this.$el.html(summary).fadeIn(1000);

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
        }
    });

    var Nodes = Backbone.Collection.extend({

        model: Node,

        comparator: function (node) {
            return node.get("name");
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

                sigmaView.bind("upnodes", function (nodes) {

                    var selectedNodeId = nodes.content[0];
                    activator.activate(selectedNodeId, sigmaView);

                    var selectedNode = sigmaView._core.graph.nodesIndex[selectedNodeId];
                    self.viewManager.selected(selectedNode);
                    self.findPath(sigmaView, selectedNode);
                });

                self.zoomAction(sigmaView);

                // Render the view.
                sigmaView.draw();
            });
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
        activate: function (nodeIndex, sigmaView) {
            var node = sigmaView._core.graph.nodesIndex[nodeIndex];

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

    // For displaying search result
    var searchView = new SearchViews({el: $(ID_SEARCH_RESULTS)});

})();