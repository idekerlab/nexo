from py2neo import neo4j
from py2neo import node, rel

# Update Graph DB

g = neo4j.GraphDatabaseService()
print(g.neo4j_version)

idx = g.get_index(neo4j.Node, "Vertex")
print(idx)

# Pick GO terms
results = idx.query("name:NEXO*")

for node in results:
	label = node["label"]
	if label is None or label is "" or len(label) == 0:
		label = node["name"]
	print(node["name"] + ": Label = " + label)
	idx.add("label",label, node)
