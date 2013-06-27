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
	
	geneMap[geneSymbol] = [sgdId, geneName, orf, synonyms]

print(geneMap)


# Update Graph DB
g = neo4j.GraphDatabaseService()
print(g.neo4j_version)

idx = g.get_index(neo4j.Node, "Vertex")
print(idx)
print(g.size())

# Pick GO terms
results = idx.query("name:NEXO*")

for node in results:
  print(node["name"] + ":")
  genesString = node["Assigned Genes"]
  genesString = genesString.replace("[", "")
  genesString = genesString.replace("]", "")
  genesString = genesString.replace(" ", "")
  genes = genesString.split(",")
  geneList = []
  for gene in genes:
    geneList.append(gene)
  
  orfsString = node["Assigned Orfs"]
  orfsString = orfsString.replace("[", "")
  orfsString = orfsString.replace("]", "")
  orfsString = orfsString.replace(" ", "")
  orfs = orfsString.split(",")
  orfList = []
  for orf in orfs:
    orfList.append(orf)
  
  #sgdIds = []
  #symbols = set()
  #synonyms = set()
  #names = set()
  #for gene in genes:
    #if gene not in geneMap:
      #continue

    #details = geneMap[gene]
    #names.add(details[1])
    #for alt in details[3]:
      #synonyms.add(alt)
      
    #sgdIds.append(details[0])

  # Add non-redundant 
  node["Assigned Genes"] = list(geneList)
  node["Assigned Orfs"] = list(orfList)
  #node["Assigned Gene Ids"] = list(sgdIds)
  #node["Assigned Gene Names"] = list(names)
  #node["Assigned Gene Synonyms"] = list(synonyms)


print(len(results))
