#!/opt/local/bin/python
import json

# data directory
SOURCE_DIR = "../data/info_gain_trees_with_genes/"

# Input data files in Cytoscape.js format
inFiles = ["biological_process.info_gain.cyjs","cellular_component.info_gain.cyjs","molecular_function.info_gain.cyjs" ];

# Output file in Sigma.js format
outFiles = ["bp-info.json","cc-info.json","mf-info.json"]

idx = 0
for inFile in inFiles:
    bpFile = open(SOURCE_DIR + inFile)
    goFile = open("go-all2.txt", "r")

    # Output files
    out = open(SOURCE_DIR + outFiles[idx], "w")

# Load Original JSON
    bp = json.load(bpFile)
    bpFile.close()

# Load Term Names
    termNames = {}
    for line in goFile:
        newLine = line.rstrip()
        entries = newLine.split("\t")
        termID = entries[0]
        termName = entries[1]
        termNames[termID] = termName
        print(termID + "=" + termName)

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
        print(termID + "==")
        
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

