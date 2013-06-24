from py2neo import neo4j
from py2neo import node, rel, gremlin

g = neo4j.GraphDatabaseService()
print(g.neo4j_version)

idx = g.get_index(neo4j.Node, "Vertex")
print(idx)
print(g.size())

results = idx.get("SGD Gene Description","None")

for node in results:
	print(node["name"])

print(len(results))
