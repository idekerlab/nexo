from py2neo import neo4j
from py2neo import node, rel

def toString(node, key):
  listValue = node[key];
  if listValue is None:
    return ""

  stringVal = ""
  for value in listValue:
    stringVal = stringVal + value + "|"

  if stringVal is "":
    return stringVal
  else:
    return stringVal[:len(stringVal)-1]

# Prepare data table:
sgdFile = open("gene_info.txt", "r")

geneMap = {}

for line in sgdFile:
	vals = line.split("\t")
	sgdId = vals[0]
	geneSymbol = vals[1]
	geneName = vals[2]
	altNames = vals[3].rstrip()
	alts = altNames.split("|")
	orf = ""
	if alts is not None and len(alts) != 0:
		orf = alts[0]

	synonyms = []
	for entry in alts:
		if entry != orf:
			synonyms.append(entry)
	
	geneMap[sgdId] = [geneSymbol, geneName, orf, synonyms]

print(geneMap)


# Update Graph DB

g = neo4j.GraphDatabaseService()
print(g.neo4j_version)

idx = g.get_index(neo4j.Node, "Vertex")
print(idx)
print(g.size())

# Pick GO terms
results = idx.query("name:GO*")

keys = ["Assigned Genes", "Assigned Gene Ids", "Assigned Gene Names", "Assigned Orf", "Assigned Gene Synonyms"]

for node in results:
  print(node["name"] + ":")
  for key in keys:
    stringValue = toString(node, key)
    print(key + " = " + stringValue)
    if len(stringValue) > 2500:
      print("TOO LONG!")
      continue
    idx.add(key, stringValue, node)


print(len(results))
