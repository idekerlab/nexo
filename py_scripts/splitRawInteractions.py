#!/opt/local/bin/python

# Generate separate file for raw interactions


original = open("./raw-interactions.txt", "r")

# output files
physical_file = open("physical.txt", "w");
genetic_file = open("genetic.txt", "w");
coex_file = open("coex.txt", "w");
yn_file = open("yeastnet.txt", "w");

pSif = open("physical.sif", "w");
gSif = open("genetic.sif", "w");
cSif = open("coex.sif", "w");
ySif = open("yeastnet.sif", "w");

def writeInteraction(file_out):
  file_out.write("")


for line in original:
  sgdS, orfS, nameS, sgdT, orfT, nameT, physical, genetic, coExpression, yeastNet = line[:-1].split('\t')
  
  if int(physical) == 1:
    physical_file.write(sgdS + "\t" + orfS + "\t" + nameS + "\t" + sgdT + "\t" + orfT + "\t" + nameT + "\n")
    pSif.write(sgdS + " physical " + sgdT + "\n")
  if int(genetic) == 1:
    genetic_file.write(sgdS + "\t" + orfS + "\t" + nameS + "\t" + sgdT + "\t" + orfT + "\t" + nameT + "\n")
    gSif.write(sgdS + " genetic " + sgdT + "\n")
  if int(coExpression) == 1:
    coex_file.write(sgdS + "\t" + orfS + "\t" + nameS + "\t" + sgdT + "\t" + orfT + "\t" + nameT + "\n")
    cSif.write(sgdS + " co-expression " + sgdT + "\n")
  if int(yeastNet) == 1:
    yn_file.write(sgdS + "\t" + orfS + "\t" + nameS + "\t" + sgdT + "\t" + orfT + "\t" + nameT + "\n")
    ySif.write(sgdS + " yeastNet " + sgdT + "\n")


original.close()
physical_file.close()
genetic_file.close()
coex_file.close()
yn_file.close()

pSif.close()
gSif.close()
cSif.close()
ySif.close()

