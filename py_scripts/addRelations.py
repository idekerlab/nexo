from py2neo import neo4j
from py2neo import node, rel

g = neo4j.GraphDatabaseService()
print(g.neo4j_version)

idx = g.get_index(neo4j.Node, "Vertex")
print(idx)


print(g.size())
raw_interactions = open('raw_interactions.sif', 'r')

for line in raw_interactions:
  new_line = line.rstrip()

  vals = new_line.split("\t")
  source = g.get_indexed_node("Vertex", "name", vals[0])
  target = g.get_indexed_node("Vertex", "name", vals[2])
  if source is not None and target is not None:
    newEdge = g.create(rel(source,"raw_interaction",target))

raw_interactions.close()

print(g.size())
