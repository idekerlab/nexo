from py2neo import neo4j
from py2neo import node, rel, gremlin

def loadGeneAssociations(gaFile, goMap):
	for line in gaFile:
		vals = line.split("\t")
		sgdId = vals[0]
		goTerm = vals[1].rstrip()
	
		geneList = []
		if goTerm in goMap:
			geneList = goMap[goTerm]

		geneList.append(sgdId)
		goMap[goTerm] = geneList

	gaFile.close()


def updateDB(goMap, geneMap):
	g = neo4j.GraphDatabaseService()
	print(g.neo4j_version)

	idx = g.get_index(neo4j.Node, "Vertex")
	print(idx)
	print(g.size())

# Pick GO terms
	results = idx.query("name:GO*")

	for node in results:

		go = node["name"]
		if go not in goMap:
			continue

		print(go + " = " + str(goMap[go]))
		genes = set(goMap[go])
		sgd = []
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
			
			sgd.append(gene)

		# Add non-redundant 
		node["Assigned Genes"] = list(symbols)
		node["Assigned Gene Ids"] = list(sgd)
		node["Assigned Orfs"] = list(orfs)
		node["Assigned Gene Names"] = list(names)
		node["Assigned Gene Synonyms"] = list(synonyms)


############################################

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

# Prepare data table:
bpFile = open("go_trees/biological_process.info_gain.gene_term.txt", "r")
ccFile = open("go_trees/cellular_component.info_gain.gene_term.txt", "r")
mfFile = open("go_trees/molecular_function.info_gain.gene_term.txt", "r")

goFiles = [bpFile, ccFile, mfFile]

goMap = {}
for goF in goFiles:
	loadGeneAssociations(goF, goMap)

print(goMap)

updateDB(goMap, geneMap)
