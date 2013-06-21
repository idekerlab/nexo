#!/opt/local/bin/python
import json
import math

genes = open("biological_process.info_gain.gene_term", "r")

term2geneMap = {}

for line in genes:
	line = line.rstrip()
	vals = line.split("\t")
	geneList = []
	if vals[1] in term2geneMap:
		geneList = term2geneMap[vals[1]]
	
	geneList.append(vals[0])
	term2geneMap[vals[1]] = geneList

genes.close()

goTree = open("../public/front/data/bp-info.json", "r")
tree = json.load(goTree)
goTree.close()

nodes = tree["nodes"]
edges = tree["edges"]

# build graph
graph = {}
for edge in edges:
	children = []
	source = edge["source"]
	target = edge["target"]

	if target in graph:
		children = graph[target]
	
	children.append(source)
	graph[target] = children

# count nodes


root = "GO:0008150"
weights = {}
minWeight = 10000
maxWeight = 0


def walk(node):
	geneList = []
	weight = 0
	if node in term2geneMap:
		geneList = term2geneMap[node]
	
	weight = weight + len(geneList)
	
	if node not in graph:
		
		#print(node + " === " + str(len(geneList)))
		weights[node] = len(geneList)
		return weights[node]
	else:
		children = graph[node]
		total = weight
		for child in children:
			total = total + walk(child)

		weights[node] = total
		#print(node + " === " + str(total))
		return total

val = walk(root)
print(val)
for key in weights:
	w = weights[key]
	if maxWeight< w:
		maxWeight = w;
	
	if minWeight > w:
		minWeight = w


print("Min = " + str(minWeight))
print("Max = " + str(maxWeight))


# Convert score to size

outOntology = open("bp2.json", "w")

for node in nodes:
	nodeId = node["id"]
	w = weights[nodeId]
	node["size"] = math.log(w+1, 1.5) + 1
	print(nodeId + ": size = " + str(node["size"]))


outOntology.write(json.dumps(tree, sort_keys=True, indent=4))
outOntology.close()


