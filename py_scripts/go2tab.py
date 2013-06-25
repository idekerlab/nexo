#!/opt/local/bin/python
import json

oboFile = open("gene_ontology_ext.obo", "r")
#outFile = open("go-full.txt", "w")

for line in oboFile:
	newLine = line.rstrip()
	if newLine == "[Term]":
		found = True
	else:
		continue

	outLine = ""
	goId = ""
	name = ""
	altIds = []
	while found:
		enLine = oboFile.readline()
		enLine = enLine.rstrip()
		if enLine == "":
			found = False
			break
		
		parts = enLine.split(":")
		
		if parts[0] == "id":
			goId = parts[1] + ":" + parts[2]
			goId = goId.lstrip()
		elif parts[0] == "name":
			name = parts[1]
			name = name.lstrip()
		elif parts[0] == "alt_id":
			altIds.append(parts[1].lstrip() + ":" + parts[2])

	print(goId + "\t" + name)
	for alt in altIds:
		print(alt + "\t" + name)

oboFile.close()
#outFile.close()

