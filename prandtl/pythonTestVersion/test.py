from gpkit import Variable, Model, VectorVariable

# Super simple quad model, to demonstrate gpkit.js

# Structure
# Singular payload, x-configuration, 3 or more rotors, symmetry of everything.
# Singular battery, minimal object spliting
# Three simple metrics, angular acceleration, thrust to weight and total hover time
# Stick to the above!

g = Variable("g",9.8,"m/s/s")

W_payload = Variable("W_payload",10,"N")

E_batt = Variable("E_batt","J")
W_batt = Variable("W_batt","N")
Pow_batt = Variable("Pow_batt",10000,"W")
SpecificEnergy_batt = Variable("SpecificEnergy_batt",0.95e6,"J/kg")

Pow_speedController = Variable("Pow_speedController","W")
SpecificPower_speedController = Variable("SpecificPower_speedController",1000,"W/kg")
efficiency_speedController = Variable("efficiency_speedController",0.9,"-")

Pow_propulsion = Variable("Pow_propulsion","W")
ThrustToPowRatio = Variable("ThrustToPowRatio",10,"N/W")
T_total = Variable("T_total","N")
W_total = Variable("W_total","N")

maxRollRate = Variable("rollRate","rad/s/s")
thrustToWeight = Variable("thrustToWeight","-")
hoverTime = Variable("hoverTime","s")

constraints = [E_batt <= W_batt*SpecificEnergy_batt/g,
			   Pow_speedController <= Pow_batt,
			   Pow_propulsion <= Pow_speedController*efficiency_speedController,
			   T_total <= Pow_propulsion*ThrustToPowRatio,
			   W_total >= W_batt + W_payload,
			   T_total >= W_total,
			   hoverTime <= E_batt/Pow_speedController]

objective = 1/hoverTime
m = Model(objective,constraints)
sol = m.solve(verbosity=0)
print sol.table()