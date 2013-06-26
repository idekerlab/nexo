from py2neo import neo4j
from py2neo import node, rel


g = neo4j.GraphDatabaseService()
print(g.neo4j_version)

idx = g.get_index(neo4j.Node, "Vertex")
print(idx)
print(g.size())

# Pick GO terms
results = idx.get("SGD Gene Description","None")

for node in results:
	name = node["name"]
	if name.startswith("S") == False and name.startswith("GO") == False:
		print("NEXO! " + node["name"])
		idx.add("name", name, node)

print(len(results))
