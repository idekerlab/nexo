# Convert interaction files to data types

# Input data files
sourceFile = open("raw-interactions.txt", "r")

for line in sourceFile:
  vals = line.split("\t")
  sgdId = vals[0]
  print(sgdId)

sourceFile.close()
