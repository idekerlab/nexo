from py2neo import neo4j
from py2neo import node, rel, gremlin

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

for node in results:
	print(node["name"] + ":")
	genes = set(node["Assigned Genes"])
	newList = []
	orfs = set()
	symbols = set()
	synonyms = set()
	names = set()
	for gene in genes:
		if gene not in geneMap:
			continue

		details = geneMap[gene]
		orfs.add(details[2])
		symbols.add(details[0])
		names.add(details[1])
		for alt in details[3]:
			synonyms.add(alt)
		
		newList.append(gene)

	# Add non-redundant 
	node["Assigned Genes"] = list(symbols)
	node["Assigned Gene Ids"] = list(newList)
	node["Assigned Orfs"] = list(orfs)
	node["Assigned Gene Names"] = list(names)
	node["Assigned Gene Synonyms"] = list(synonyms)


print(len(results))
