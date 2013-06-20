#!/opt/local/bin/python
import json

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
for key in term2geneMap:
	geneList = term2geneMap[key]
	for key2 in geneList:
		print(key2)


root = "GO:0008150"
weights = {}

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
	print(key + " = " + str(weights[key]));
