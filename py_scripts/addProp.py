from py2neo import neo4j
from py2neo import node, rel

# Update Graph DB

g = neo4j.GraphDatabaseService()
print(g.neo4j_version)

idx = g.get_index(neo4j.Node, "Vertex")
print(idx)
print(g.size())

# Pick All terms
results = idx.query("name:*")

for node in results:
  print(node["name"])
  name = node["name"]
  if name is None:
    continue

  if name.startswith("S"):
    geneName = node["Assigned Genes"]
    node["label"] = geneName
  elif name.startswith("GO"):
    goTerm = node["term name"];
    node["label"] = goTerm
  elif name.startswith("NEXO"):
    nexoTerm = node["CC Annotation"];
    if nexoTerm is None or nexoTerm is "":
      node["label"] = name
    else:
      node["label"] = nexoTerm

print(len(results))
