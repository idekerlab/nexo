#!/opt/local/bin/python
import json

# Input data files
nexoFile = open("nexo-readable.json")
edgeTable = open("edgetable.csv", "r")
nodeTable = open("nexoby3.json", "r")

# Output files
out = open("nexo2.json", "w")
csvout = open("nexo-edgelist.csv", "w")
edgeOut = open("nexo-edge.csv", "w")

# Complete JSON for NeXO
complete = open("nexo-complete.json", "w")
# Minimal
minimal = open("nexo-minimal.json", "w")


# Create term name
def generateTermName(data, termID):
	bestScoreType = data["Best Alignment Score"]
	name = ""
	if bestScoreType == "bp":
		name = data["BP Annotation"]
	elif bestScoreType == "cc":
		name = data["CC Annotation"]
	else:
		name = data["MF Annotation"]

	# Not found.  Just use ID
	if name == "":
		name = "NeXO:" + termID

	return name


# Parse entry
minimalGraph = {}
minimalEdgeList = []
minimalNodeList = []

edgeMap = {}
nodeMap = {}
geneName2sgd = {}


nexo3 = json.load(nodeTable)
nodeTable.close()

nexo3Nodes = nexo3["elements"]["nodes"]

for node in nexo3Nodes:
	termID = node["data"]["NeXO Term ID / SGD Gene ID"]
	geneNames = node["data"]["Assigned Genes"]
	orfNames = node["data"]["Assigned Orfs"]
	
	newNode = {}
	if termID.startswith("S"):
		nodeType = "gene"
		newNode = {'id':termID, 'label':geneNames}
		geneName2sgd[geneNames] = termID
		#print(termID + ": Gene name = " + geneNames)
	else:
		nodeType = "term"
		termName = generateTermName(node["data"], termID)
		newNode = {'id':termID, 'label':termName}
		#print(termID + ": Term ID = " + termName)

	minimalNodeList.append(newNode)
	nodeMap[termID] = newNode


# Create edge - SWAPPING SOURCE & TARGET
def parseEdgeLine(line):
	elements = line.split(",")
	edgeElements = elements[1].split(" ")
	if len(edgeElements) != 3:
		print("Invalid line: " + line)
	else:
		source = edgeElements[2]
		target = edgeElements[0]
		relationship = elements[5]
		if relationship == "parent_of":
			relationship = "child_of"
		edge = {'source':source, 'target':target, 'relationship':relationship}
		minimalEdgeList.append(edge)
		edgeMap[source + " " + target] = edge


############################
# Create a minimal JSON file
############################
for line in edgeTable:
	newLine = line.replace("\"", "")
	parseEdgeLine(newLine)

minimalGraph["nodes"] = minimalNodeList
minimalGraph["edges"] = minimalEdgeList

minimal.write(json.dumps(minimalGraph, sort_keys=True, indent=4))

######################################
# Parse original JSON
nexo = json.load(nexoFile)
nexoFile.close()

nodes = nexo["nodes"]
edges = nexo["edges"]

nodeList = []
edgeList = []
nodeIdMap = {}
edgeIdMap = {}

for node in nodes:
	nodeLabel = node["label"]
	color = node["color"]
	size = node["size"]
	x = node["x"]
	y = node["y"]

	newLabel = nodeLabel.split("|")[0]
	newLabel = newLabel.replace(" ", "")
	nodeID = newLabel.replace("NeXO:", "")
	if nodeID in geneName2sgd:
		nodeID = geneName2sgd[nodeID]
	
	nodeIdMap[node['id']] = nodeID
	newNode = {'id':nodeID}
	if nodeID not in nodeMap:
		print("ERROR: " + nodeID)
	else:
		finalNode = nodeMap[nodeID]
		finalNode["color"] = color
		finalNode["size"] = size
		finalNode["x"] = x
		finalNode["y"] = y
		#print(json.dumps(finalNode, sort_keys=True, indent=4))
		nodeList.append(finalNode)

for edge in edges:
	weight = edge['attributes']['weight']
	source = nodeIdMap[edge['target']]
	target = nodeIdMap[edge['source']]
	key = source + " " + target
	
	minimalEdge = {}
	if key in edgeMap:
		minimalEdge = edgeMap[key]
		minimalEdge["weight"] = weight
	else:
		print("ERROR!")
	
	csvout.write(minimalEdge['source'] + "," + minimalEdge['target'] + "\n")
	edgeList.append(minimalEdge)

graph = {}

graph["nodes"] = nodeList
graph["edges"] = edgeList

out.write(json.dumps(graph, sort_keys=True, indent=4))

for line in edgeTable:
	newLine = line.replace("\"", "")
	entries = newLine.split(",")
	edgeName = entries[1]
	edgeComponents = edgeName.split(" ")
	if len(edgeComponents) == 3:
		source = edgeComponents[2]
		target = edgeComponents[0]
		interaction = entries[5]

		newLine = source + " " + interaction + " " + target
		#print(newLine)

out.close()
csvout.close()
edgeOut.close()
edgeTable.close()
