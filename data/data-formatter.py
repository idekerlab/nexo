#!/usr/bin/env python

result={}

counter = 1

nodes={}
edges={}

f = open('nodes.csv', 'w')
f.write("nexo_id\tname\tdefinition\tcomment\n")

for line in open('nexo-node.txt','r'):
  newLine = line.replace("\"", "")
  name,  comment, definition, termName = newLine[:-1].split('\t')
  termID = name.split(":")[1]
  
  f.write(termID +"\t" + termName + "\t" + definition + "\t" + comment + "\n")
  nodes[termID] = counter
  counter=counter+1

f.close()

# Edges
f = open('rels.csv', 'w')
f.write("start\tend\ttype\n")

for line in open('nexo-edge.sif','r'):
  source, interaction, target = line[:-1].split('\t')
  
  sourceID = source.split(":")[1]
  targetID = target.split(":")[1]
  f.write(str(nodes[sourceID])+ "\t" + str(nodes[targetID])+ "\t" + interaction + "\n")

f.close()

