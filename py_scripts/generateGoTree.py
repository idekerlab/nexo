#!/opt/local/bin/python

#
# Generate gene ontology tree with genes as leaves.
#

ccFile = open("../data/info_gain_trees_precollapsed_GO/cellular_component.info_gain.term_term.txt", "r")
bpFile = open("../data/info_gain_trees_precollapsed_GO/biological_process.info_gain.term_term.txt", "r")
mfFile = open("../data/info_gain_trees_precollapsed_GO/molecular_function.info_gain.term_term.txt", "r")

ccGeneFile = open("../data/info_gain_trees_precollapsed_GO/cellular_component.info_gain.gene_term.txt", "r")
bpGeneFile = open("../data/info_gain_trees_precollapsed_GO/biological_process.info_gain.gene_term.txt", "r")
mfGeneFile = open("../data/info_gain_trees_precollapsed_GO/molecular_function.info_gain.gene_term.txt", "r")

ccDegree = open("../data/info_gain_trees_precollapsed_GO/cc_degree.txt", "r")
bpDegree = open("../data/info_gain_trees_precollapsed_GO/bp_degree.txt", "r")
mfDegree = open("../data/info_gain_trees_precollapsed_GO/mf_degree.txt", "r")

# 1. Prepare term-gene list
def generateTermMap(gene_list):
  terms = {}
  for line in gene_list:
    vals = line.split("\t")
    gene = vals[0]
    term = vals[1].rstrip()
    geneList = []
    if term in terms:
      geneList = terms[term]
    
    geneList.append(gene)
    terms[term] = geneList
  
  return terms

# 2. Load degree list
def getDegrees(degree_file):
  degreeMap = {}
  for line in degree_file:
    vals = line.split("\t")
    term = vals[0]
    degree = vals[1].rstrip()
    degreeMap[term] = degree
  
  return degreeMap

# 3. Add edges to the leaves.
def addLeaves(tree_file, degrees, genes):
  tree = {}
  used = set([])
  for line in tree_file:
    vals = line.split("\t")
    source = vals[0]
    target = vals[1]
    interaction = vals[2].rstrip()
    print(source + " " + interaction + " " + target)
    degree = degrees[source]

    if int(degree) == 1:
      #print("FOUND####################: " + source)
      if source in genes:
	geneList = genes[source]
	for gene in geneList:
	  if gene not in used and source is not "GO:0005622":
	    print(gene + " assigned_to " + source)

	  used.add(gene)



############# Main ############
ccTerms = generateTermMap(ccGeneFile)
ccD = getDegrees(ccDegree)
addLeaves(ccFile, ccD, ccTerms)

#for term in ccTerms:
#  print(term)

#
#for term in ccD:
#  print(term + str(ccD[term]))

bpFile.close()
ccFile.close()
mfFile.close()

bpGeneFile.close()
ccGeneFile.close()
mfGeneFile.close()

bpDegree.close()
ccDegree.close()
mfDegree.close()
