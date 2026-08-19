import json
import sys

candidate = json.load(sys.stdin)
values = [float(value) for value in candidate.values()]
print(json.dumps({"objectives": {"value": sum(value * value for value in values)}, "constraints": {}, "diagnostics": {"benchmark": "sphere"}}))
