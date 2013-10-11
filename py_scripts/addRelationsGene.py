from py2neo import neo4j
from py2neo import node, rel

g = neo4j.GraphDatabaseService()
print(g.neo4j_version)

idx = g.get_index(neo4j.Node, "Vertex")
print(idx)
print(g.size())

# New edges to be added.
gene2term = open('../data/info_gain_trees_with_genes/gene2goterms.txt', 'r')

for line in gene2term:
  new_line = line.rstrip()

  vals = new_line.split(" ")
  source = g.get_indexed_node("Vertex", "name", vals[0])
  target = g.get_indexed_node("Vertex", "name", vals[2])
  if source is not None and target is not None:
    #print(vals[0] + " ---> " + vals[2])
    newEdge = g.create(rel(source,"gene_association_go",target))
  
#  if source is None:
#    print("SOURCE ERR============================= " + vals[0])

#  if target is None:
#    print("target ERR============================= " + vals[2])
#  elif target is None and source is None:
#    print("WARN: this should not happen!!!!!!!!!!! " + new_line)

gene2term.close()

print(g.size())
