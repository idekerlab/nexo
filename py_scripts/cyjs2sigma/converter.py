__author__ = 'kono'

import json

JSON_EXT = '.json'
CYTOSCAPE_JS_EXT = '.cyjs'

def convert2sigma(file_name, target_dir, output_dir):
    print('Source file: ' + file_name)

    # Load Original JSON
    cyjs_file = open(target_dir + '/' + file_name)
    source_json = json.load(cyjs_file)
    cyjs_file.close()

    goFile = open("go-all.txt", "r")

    # Output files
    out_file_name = file_name.replace(CYTOSCAPE_JS_EXT, JSON_EXT)
    out = open(output_dir + '/' + out_file_name, "w")

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

    sourceNodes = source_json["elements"]["nodes"]
    sourceEdges = source_json["elements"]["edges"]

    nodeList = []
    edgeList = []

    for node in sourceNodes:
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

    for edge in sourceEdges:
        source = nodeMap[edge['data']['source']]
        target = nodeMap[edge['data']['target']]
        interaction = edge['data']['interaction']
        edgeList.append({'source':source, 'target':target, 'relationship':interaction, 'weight':1.0})

    graph = {}

    graph["nodes"] = nodeList
    graph["edges"] = edgeList

    out.write(json.dumps(graph, sort_keys=True, indent=4))
    out.close()
