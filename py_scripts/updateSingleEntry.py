from py2neo import neo4j
from py2neo import node, rel

# Update Graph DB

g = neo4j.GraphDatabaseService()
print(g.neo4j_version)

node = g.get_indexed_node('Vertex', 'name', 'NEXO:9715')

print(node)

print(node["MF Annotation"])
print(node["MF Definition"])

node["MF Annotation"] = ""
node["MF Definition"] = ""

print(node["MF Annotation"])
print(node["MF Definition"])
print('=========== Done! ============')
