# http://stackoverflow.com/questions/3768895/how-to-make-a-class-json-serializable
import gpkit
from json import JSONEncoder
import json
import numpy as np

# Parse a Solution object into JSON, filtering for fixed or free variables
class MyEncoder(JSONEncoder):
    def default(self, o):
    	
    	cleanVarResults = {}
    	for varKey in o.variables:
    		var = o.variables[varKey]
    		print type(var)
    		print type(var.valArr[0])
    		print var.name
    		cleanVarResults[varKey] = {"name":var.name,"valArr":var.valArr,"units":var.units,"label":var.label}
    	print cleanVarResults
    	return json.dumps({'variables':cleanVarResults})
        

class Solution(object):

	def __init__(self):
		self.variables = {}
		self.varDict = {}
	def translateSol(self,sol,varDict):
		for variableKey in varDict:
			variable = varDict[variableKey]
			 
			self.variables[variableKey] = initVarFromGPkitSol(variable,sol)
		self.varDict = varDict

def initVarFromGPkitSol(gpkitVar,sol):
	# Sol will return one of two things when we query for a var, either a pint quantity
	# or a numpy.float64 when it's something being optimized
	print gpkitVar.__dict__
	name = gpkitVar.key.descr["name"]
	# print type(sol(gpkitVar))
	if isinstance(sol(gpkitVar),np.float64):
		valArr = [float(sol(gpkitVar))]
	else:
		magArr = float(sol(gpkitVar)._magnitude)
		valArr = [magArr]

	# Units come back as either a pint quantity of magnitude 1 in the units described,
	# or as a unicode string of the units, in the format that pint uses.
	if isinstance(gpkitVar.units,unicode):
		units = str(gpkitVar.units)
	else:
		units = str(gpkitVar.units.units)

	if "label" in gpkitVar.__dict__:
		label = gpkitVar.label
	else:
		label = ""

	returnVar = Variable(name,valArr,units,label)
	
	return returnVar

		
class Variable(object):
	def __init__(self,name,valArr,units,label):
		self.name = name
		self.valArr = valArr
		self.units = units
		self.label = label


def parseJSVar(jsVar, varDict):

	if type(jsVar) == dict:
		# for varKey in varDict:
		# 	# if jsVar["name"] == str(varDict[varKey].exps[0].keys()[0]):
		# 	# 	arrNameAppend = True
		if "name" in jsVar:

			tempVar = gpkit.Variable(jsVar["name"])

			if "units" in jsVar:
				tempVar.units = jsVar["units"]
			if "val" in jsVar:
				tempVar = gpkit.Variable(str(tempVar.exps[0].keys()[0]),jsVar["val"],jsVar["units"])

			if "label" in jsVar:
				tempVar.label = jsVar["label"]
			# We have all these variables coming in, but need to track which is which, this was the point
			# of the ID assignment
			# We store variables in a dictionary under JS ID
			if "ID" in jsVar:
				if jsVar["ID"] not in varDict:
					varDict[jsVar["ID"]] = tempVar
				else:
					tempVar = varDict[jsVar["ID"]]
				return tempVar

class Solver(object):
	def __init__(self):
		self.modelDict = {}
	def initFromRequest(self,request):
		  r= request.form
		  for line in r:
		  	resultString = str(line);
		  self.modelDict = json.loads(resultString)

	def createSignomial(self,JSinput,varDict):
		# print JSinput

		# Handle a JS monomial
		if "expArr" in JSinput:
			expDictList = []
			constantsList = []
			expDict = {}
  			constant = 1
  			for variableArr in JSinput["expArr"]:
  				jsVar = variableArr[0]

  				if type(jsVar) == dict:
  					tempVar = parseJSVar(jsVar,varDict)
			  		expDict[tempVar] = variableArr[1]  
  				else:
  					# If there isn't a name, it musn't be a variable, but instead
  					# a raw number
  					# print jsVar
  					constant*=jsVar
  			expDictList += [expDict]
  			constantsList += [constant]
		else:
			# Handle a JS posynomial
		  	if not JSinput["isSignomial"]:

		  		expDictList = []
		  		constantsList = []

		  		for monomial in JSinput["monomialsArr"]:
		  			expDict = {}
		  			constant = 1
		  			for variableArr in monomial["expArr"]:
		  				jsVar = variableArr[0]

		  				if type(jsVar) == dict:
		  					tempVar = parseJSVar(jsVar,varDict)
					  		expDict[tempVar] = variableArr[1]  
		  				else:
		  					# If there isn't a name, it musn't be a variable, but instead
		  					# a raw number
		  					# print jsVar
		  					constant*=jsVar

		  				
		  			expDictList += [expDict]
		  			constantsList += [constant]

		return gpkit.Signomial(tuple(expDictList),tuple(constantsList))

	def solve(self):

	  constraints = []
	  varDict = {}
	  
	  for constraint in self.modelDict["constraints"]:
	  	# print constraint
	  	# Check for Monomial equality, if something else just make signomial inequality
	  		
	  	left = self.createSignomial(constraint['left'],varDict)
	  	right = self.createSignomial(constraint['right'],varDict)

	  	# print left,right
	  	with gpkit.SignomialsEnabled():
		  	if constraint['oper'] == "leq":
		  		constraints+=[left<=right]
		  	if constraint['oper'] == "geq":
		  		constraints+=[left>=right]
		  	if constraint['oper'] == "eq":
		  		constraints+=[left==right]
		print constraints[-1]

	  cost = self.createSignomial(self.modelDict["cost"],varDict)
	  # print cost
	  # print('final inputs to JS model')
	  
	  # print(constraints)
	  # print cost
	  m = gpkit.Model(cost,constraints)
	  sol = m.solve(verbosity=0)
	  # print('solution dict')
	  # print(sol.program.result["variables"])
	  jsSol = Solution()
	  jsSol.translateSol(sol,varDict)

	  output = MyEncoder().encode(jsSol)
	  # print output
	  return output