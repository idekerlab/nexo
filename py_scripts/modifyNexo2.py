#!/opt/local/bin/python
import json

# Input data files
nexoFile = open("nexo3.json", "r")

# Output files
out = open("nexo4.json", "w")

# Load Full
nexo3 = json.load(nexoFile)
nexoFile.close()

nexoNodes = nexo3["nodes"]
nexoEdges = nexo3["edges"]

for node in nexoNodes:
	nodeLabel = node["id"]
	if nodeLabel.startswith("S"):
		continue

	nodeLabel = "NEXO:" + nodeLabel
	node["id"] = nodeLabel

for edge in nexoEdges:
	sourceLabel = edge["source"]
	targetLabel = edge["target"]
	if sourceLabel.startswith("S") == False:
		sourceLabel = "NEXO:" + sourceLabel
		edge["source"] = sourceLabel

	if targetLabel.startswith("S") == False:
		targetLabel = "NEXO:" + targetLabel
		edge["target"] = targetLabel

out.write(json.dumps(nexo3, sort_keys=True, indent=4))
out.close()

