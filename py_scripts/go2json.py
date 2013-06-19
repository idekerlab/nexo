#!/opt/local/bin/python
import json

# Input data files
inFiles = ["go-tree-bp-infogain.json","go-tree-cc-infogain.json","go-tree-mf-infogain.json" ];
outFiles = ["bp-info.json","cc-info.json","mf-info.json"]

idx = 0
for inFile in inFiles:
	bpFile = open(inFile)
	goFile = open("go-terms.txt", "r")

# Output files
	out = open(outFiles[idx], "w")

# Load Original JSON
	bp = json.load(bpFile)
	bpFile.close()

# Load Term Names
	termNames = {}
	for line in goFile:
		newLine = line.replace("\"", "")
		entries = newLine.split("\t")
		termID = entries[0]
		termName = entries[1]
		termNames[termID] = termName
		print(termID + " = " + termName)

	goFile.close()

	nodeMap = {}

	bpNodes = bp["elements"]["nodes"]
	bpEdges = bp["elements"]["edges"]

	nodeList = []
	edgeList = []

	for node in bpNodes:
		termID = node["data"]["name"]
		x = node["position"]["x"]
		y = node["position"]["y"]
		suid = node["data"]["SUID"]
		size = 4.0
		if termID in termNames:
			newNode = {'id':termID, 'label':termNames[termID], 'size':size, 'x':x, 'y':y, 'color':"rgb(58,50,43)"}
		else:
			newNode = {'id':termID, 'label':termID, 'size':size, 'x':x, 'y':y, 'color':"rgb(58,50,43)"}
		nodeMap[str(suid)] = termID
		nodeList.append(newNode)

	for edge in bpEdges:
		source = nodeMap[edge['data']['source']]
		target = nodeMap[edge['data']['target']]
		interaction = edge['data']['interaction']
		edgeList.append({'source':source, 'target':target, 'relationship':interaction, 'weight':1.0})

	graph = {}

	graph["nodes"] = nodeList
	graph["edges"] = edgeList

	out.write(json.dumps(graph, sort_keys=True, indent=4))
	out.close()
	idx = idx+1
