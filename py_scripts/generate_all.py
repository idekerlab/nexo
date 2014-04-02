__author__ = 'kono'

import sys
import os

from cyjs2sigma import *

CYTOSCAPE_JS_EXT = '.cyjs'

target_dir = sys.argv[1]
out_dir = sys.argv[2]

print('Target source data directory: ' + target_dir)

all_files = os.listdir(target_dir)

for file in all_files:
    if file.endswith(CYTOSCAPE_JS_EXT):
        print('Processing Cytoscape.js file: ' + file)
        converter.convert2sigma(file, target_dir, out_dir)
