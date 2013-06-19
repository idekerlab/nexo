#!/opt/local/bin/python
import json

# Input data files
nexoFile = open("nexo2.json", "r")

# Output files
out = open("nexo3.json", "w")

# Full data
fullNexo = open("nexoby3.json", "r")

LABEL_TARGET = "CC Annotation"

# Load Full
nexo3 = json.load(fullNexo)
fullNexo.close()

# Load current
nexo2 = json.load(nexoFile)
nexoFile.close()

nexo2Nodes = nexo2["nodes"]
fullNodes = nexo3["elements"]["nodes"]

id2CC = {}
for node in fullNodes:
  id2CC[node["data"]["NeXO Term ID / SGD Gene ID"]] = node["data"][LABEL_TARGET]


for node in nexo2Nodes:
    termID = node["id"]
    if termID.startswith("S"):
        print(termID + ": This is Gene name")
    else:
        termLabel = id2CC[termID]
        if termLabel == "":
            node["label"] = ""
        else:
            node["label"] = termLabel
        

out.write(json.dumps(nexo2, sort_keys=True, indent=4))
out.close()

