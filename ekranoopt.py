import numpy as np
import gpkit
from gpkit import Variable, Model
from gpkit.feasibility import feasibility_model
from gpkit.interactive.plotting import plot_convergence
import matplotlib.pyplot as plt
from gpkit import ConstraintSet


def calcC_Df(Re):
	#http://naca.central.cranfield.ac.uk/reports/arc/cp/0142.pdf
	# return 0.46 * (np.log10(Re))**-2.6
	return 0.46*float(math.log10(Re)**-2.6)

class ExternalConstraint(ConstraintSet):
    "Class for external calling"
    # Overloading the __init__ function here permits the constraint class to be
    # called more cleanly at the top level GP.
    def __init__(self, x, y, **kwargs):

        # Calls the ConstriantSet __init__ function
        super(ExternalConstraint, self).__init__([], **kwargs)

        # We need a GPkit variable defined to return in our constraint.  The
        # easiest way to do this is to read in the parameters of interest in
        # the initiation of the class and store them here.
        self.x = x
        self.x = 10000
        self.y = y

    # Prevents the ExternalConstraint class from solving in a GP, thus forcing
    # iteration
    def as_posyslt1(self):
        raise TypeError("ExternalConstraint Model cannot solve as a GP.")

    # Returns the ExternalConstraint class as a GP compatible constraint when
    # requested by the GPkit solver
    def as_gpconstr(self, x0):

        # Unpacking the GPkit variables
        x = self.x
        y = self.y

        # Creating a default constraint for the first solve
        if not x0:
            return (y >= x)

        # Returns constraint updated with new call to the external code
        else:
            # Unpack Design Variables at the current point
            x_star = x0["wingRe"]

            # Call external code
            res = calcC_Df(x_star)

        # Return linearized constraint
        return (y >= res*x/x_star)


LD = Variable("LD",12,'-')
Wfrac = Variable('Wfrac','-','log weight fraction')
# TSFC = Variable('TSFC','kg/s/N','thrust specific fuel consumption')
V = Variable('V','m/s','cruise speed')
Vmin = Variable('Vmin',23,'m/s','takeoff speed')
g = Variable('g',9.8,'m/s/s','gravitational acceleration')
T = Variable('T','N','cruise thrust of engine')
C_D = Variable('C_D','-','cruise drag coefficient')
rho = Variable('rho',1.225,'kg/m^3','air density')
S = Variable('S','m^2','wing reference area')
W = Variable('W','N','total weight (full fuel)')
C_L = Variable('C_L',0.5*0.66,'-','cruise lift coefficient')
C_Lmax = Variable('C_Lmax',1.4*0.66,'-','takeoff lift coefficient')
P = Variable('P','W','cruise power')
P_upper = Variable('P',26099,'W','max power')
A = Variable('A','-','wing aspect ratio')
span = Variable('span','m','wing total span, tip to tip')
wingChord = Variable('wingChord','m','wing chord, constant over the wing')
C_Di = Variable('C_Di','-','wing lift induced drag coefficient')
C_Df = Variable('C_Df','-','wing skin friction coefficient')
C_D0 = Variable('C_D0','-','Total parasite drag coefficient')
# C_Dfuse
wingRe = Variable('wingRe','-','wing reynolds number')
e = Variable('e','-','wing span efficiency factor')
mu = Variable("\\mu", 1.78e-5, "kg/m/s", "viscosity of air")
z_bre = Variable("z_bre",'-','gp range parameter')
# http://cta.ornl.gov/bedb/appendix_a/Lower_and_Higher_Heating_Values_of_Gas_Liquid_and_Solid_Fuels.pdf
# http://web.mit.edu/~whoburg/www/papers/hoburg_phd_thesis.pdf
constraints = []

# Add the wing geometry constraints
constraints += [A <= span/wingChord,
                S <= span*wingChord]

R = Variable('R','m','range')
#Drag model

# Parasite drag from raymer 162 and 329
# model boat Atop as 0.4 x 5 m = 2 m^2 therefore the Swet is just 3.4 *(Atop*1.5/2) = 5.1
S_wetboat = Variable('S_wetboat',5.1,'m^2','boat air wetted area')
S_wetwing = Variable('S_wetwing','m^2','wing wetted area')
wettedAreaRatio = Variable('wettedAreaRatio','-','wetted area ratio')
with gpkit.SignomialsEnabled():
    constraints+=[S_wetwing >= S*(1.977 + 0.52),
                  wettedAreaRatio >= (S_wetwing + S_wetboat)/S,
                  C_D0 >= 0.0065*wettedAreaRatio
                ]


with gpkit.SignomialsEnabled():
	constraints += [e <= 1.78*(1-0.045*A**0.68)-0.64, e>=0.1,A<=3*1.38] #Raymer 12.6 
constraints+=[C_Di >= C_L**2/(3.1415*e*A),
			wingRe <= (rho/mu)*V*(S/A)**0.5,
			C_Df >= 0.074*(wingRe)**-0.2,
			# ExternalConstraint(wingRe,C_Df),
			C_D >= C_Di+C_Df + C_D0]

#Weights
W_boat = Variable('W_boat',10.4*9.8,'N','boat weight')
W_person = Variable('W_person',75*9.8,'N','person weight')
W_acc = Variable('W_acc',10*9.8,'N', 'accessories weight')
W_eng = Variable('W_eng','N', 'engine weight')
W_wings = Variable('W_wings','N','wing weight') # Both wings
W_tail = Variable('W_tail',10*9.8,'N','tail weight')
W_boom = Variable('W_boom',10*9.8,'N','tail boom weight')
W_mnt = Variable('W_mnt',8*9.8,'N','mount weight')
W_fuel = Variable('W_fuel','N','fuel weight')
W_zfw = Variable('W_zfw','N','zero fuel weight')
W_fuse = Variable('W_fuse','N','weight of everything except for wings')
with gpkit.SignomialsEnabled():
	constraints+=[W_zfw>= W_boat + W_person + W_acc + W_eng + W_wings + W_boom + W_tail + W_mnt]
	constraints+=[W >= W_zfw+W_fuel]
	constraints+=[W_fuel/W_zfw >= z_bre + (z_bre**2)/2 + (z_bre**3)/6 + (z_bre**4)/24]
	constraints+=[W_fuse >= W_boat + W_person + W_acc + W_eng + W_boom + W_tail + W_mnt + W_fuel]
	constraints+=[W <= Variable('Wupper',2500,'N','weight upper limit imposed by boat')]

#Engine calculations
#From here: http://www.dynomitedynamometer.com/dyno-tech-talk/using_bsfc.htm
BSFC = Variable('BSFC',(0.85 /2.205) / (745.7*3600),'kg/W/s','brake fuel consumption per horsepower')

# # TSFC <= (BSFC*P)/T
mdot = Variable('mdot','kg/s','fuel mass flow')
constraints+=[mdot >= P*BSFC]
h_fuel = Variable('h_fuel',42.448e6,'J/kg','heating value of conventional gasoline')

#P_fuel = Variable('P_fuel',mdot*h_fuel,'W','fuel power')
#constraints+=[P_fuel <= mdot*h_fuel]
powerToWeight_eng = Variable('powerToWeight_eng',61.93,'W/N','Power to weight sampled linearly at current eng')
constraints+=[P<=P_upper,
			  P<=powerToWeight_eng*W_eng]
# # 			P_fuel >= Variable('P_fuellower',0.1,'W','fuel power lower limit')]
a = 0.8
#Propulsion whole chain
#Propeller model from http://arc.aiaa.org/doi/pdf/10.2514/1.6564
J = Variable('J','-','propeller advance ratio')
f_prop = Variable('f_prop','1/s','prop frequency')
D_prop = Variable('D_prop',1.4,'m','prop diameter')
n_prop = Variable('n_prop','-','propeller efficiency')

constraints+=[J<=V/(f_prop*D_prop),
			  f_prop <= Variable('f_proplimit',45,'1/s','prop speed limit'),
			  f_prop >= Variable('f_proplower',35,'1/s','prop speed lower limit'),
			  n_prop <= a*J,
			  J <= 1] #As defined by manufacturer at 2600 RPM
constraints+=[T<=(P*n_prop)/V]

n_eng = Variable('n_eng',0.29,'-','engine efficiency')
n_0 = Variable('n_0','-','whole chain propulsion efficiency')
constraints+=[n_0<=n_eng*n_prop]

#Structures
#6061-T6 wing model, two sticks and fabric stretched approach
#		  - - - - - - - 
#	(s1)-      fabric^  ---(s2)
#
# Load is assumed to be at the center of aerodynamic pressure
# http://ocw.mit.edu/courses/aeronautics-and-astronautics/16-01-unified-engineering-i-ii-iii-iv-fall-2005-spring-2006/systems-labs-06/spl10.pdf
N_factor = Variable('N_factor',3,'-','ultimate wing load factor')
M_root = Variable('M_root','N*m','Wing root bending moment')
wing_span = Variable('wing_span','m','wing span (tip to tip)')
wing_taperRatio = Variable('wingTaperRatio',1,'-','wing taper ratio')
r_1 = Variable('r_1','m','radius of front wing spar')
r_1upper = Variable('r_1upper',0.06,'m','radius limit of front wing spar')
t_1 = Variable('t_1','m','thickness of front wing spar')
I_1 = Variable('I_1','m^4','second moment of area of front wing spar')
E_1 = Variable('E_1',69000000000,'Pa','Youngs modulus of front wing spar') #6061 Aluminum
s_1 = Variable('s_1','N/m^2','stress on front wing spar')
s_1limit = Variable('s_1limit',240000000,'N/m^2','yield stress for front wing spar')
rho_1 = Variable('rho_1',2700,'kg/m^3','material density of front wing spar')
W_t1 = Variable('W_t1','N','weight of front wing spar')


r_2 = Variable('r_2','m','radius of rear wing spar')
r_2upper = Variable('r_2upper',0.06,'m','radius limit of rear wing spar')
t_2 = Variable('t_2','m','thickness of rear wing spar')
I_2 = Variable('I_2','m^4','second moment of area of rear wing spar')
E_2 = Variable('E_2',69000000000,'Pa','Youngs modulus of rear wing spar') #6061 Aluminum
s_2 = Variable('s_2','N/m^2','stress on rear wing spar')
s_2limit = Variable('s_2limit',240000000,'N/m^2','yield stress for rear wing spar')
rho_2 = Variable('rho_2',2700,'kg/m^3','material density of rear wing spar')
W_t2 = Variable('W_t2','N','weight of rear wing spar')
deflec_1 = Variable('deflec_1','m','deflection of front wing spar')
deflec_2 = Variable('deflec_2','m','deflection of rear wing spar')

W_fabric = Variable('W_fabric','N','weight of fabric')

FOS = Variable('FOS',1.5,'-','factor of safety')

rho_fabric = Variable('rho_fabric',0.425,'kg/m^2','fabric density per sq meter')

# First eqn is drela eqn 40
constraints+=[M_root >= 0.125*N_factor*W_fuse*(span),
			  I_1 <= 3.141*(r_1**3)*t_1,
			  r_1 <= Variable('r_1lower',0.06,'m','lower lim for r_1'),
			  t_1 >= Variable('t_1lower',0.0001,'m','lower lim for t_1'),
			  s_1 >= 0.5*M_root*r_1/I_1,
			  s_1 <= s_1limit/FOS
			  ]

constraints+=[	I_2 <= 3.141*(r_2**3)*t_1,
		r_2 <= Variable('r_2lower',0.025,'m','upper lim for r_2'),
		t_2 >= Variable('t_2lower',0.0001,'m','lower lim for t_1'),
		s_2 >= 0.5*M_root*r_2/I_2,
		s_2 <= s_2limit/FOS
	    ]

#constraints +=[deflec_1 >= M_root*span**2/(E_1*I_1*8),
#			  deflec_2 <= M_root*span**2/(E_1*I_1*8),
#			  deflec_1 <= deflec_2]

# Need to introduce deflection constraint


with gpkit.SignomialsEnabled():
	constraints+=[W_t1 >= g*rho_1*span * 3.141* (t_1**2 + 2*r_1*t_1),
			W_t2 >= g*rho_1*span*3.141*(t_2**2 + 2*r_2*t_2),
				  W_fabric >= g*rho_fabric*S,
				  W_wings>= W_t1 +W_t2+ W_fabric]

# Takeoff flight constraints
D_water = Variable('D_water','N','drag of water on hull during takeoff condition')
# Raymer thinks on p285 that the drag of the water is only 20% of the waterborne weight
# Savitsky seems to think this, based on linear extrapolation:
# total resistance / waterborne weight = 0.015 * (V/sqrt(LWL)) + 0.055
W_MTOW = Variable('W_MTOW','N','weight var for MTOW')

# savitskyConstant = Variable('savitskyConstant',0.055,'-','savitsky constant from eqn')
# constraints += [W_MTOW >= W_zfw + W_fuel,
# 				 >= ,
# 				]
#Cruise flight constraints
constraints += [R <= (W_fuel/(mdot*g)) * V,
		#R<=(V/g)*(1/TSFC)*(C_L/C_D)*Wfrac,
			   W_fuel <= Variable('W_fuelupper',18*9.8,'N','fuel upper limit'),
			   #R >= Variable("R_lower",1e3,'m','range lower bound'),
			   z_bre >= (g*R*T)/(h_fuel*n_0*W),
			   T >= 0.5*rho*C_D*S*V**2,
			   W <= 0.5 * rho * C_L * S * V**2,
			   W <= 0.5 * rho * C_Lmax * S * Vmin**2]

objective = 1/R
m = Model(objective,constraints)
so2 = feasibility_model(m.gp(),"max")
sol = m.solve(verbosity=0)
print(sol.table())
rangeInKm = sol(0.001/objective)
#We want the range to be 500 km, as determined by the crossing from Greenland to Iceland and Iceland to Faroe Islands
#these crossings are around 480 km, which means we need to have an ideal cruise in that wave height of 500 km
#without that, no point building the thing
rangeObjective = 500

print('Range is ' + str(sol(0.001/objective))+' km')
print('At %s percent of range goal'%str(100*rangeInKm/rangeObjective))
print('MTOW of ' + str(sol(W)))
print('Cruise LD of '+str(sol(C_L/C_D)))
W_fuelsol = sol(W_fuel)
W_zfwsol = sol(W_zfw)
print('Full fuel fraction of ' +str(W_fuelsol/(W_zfwsol+W_fuelsol)))
# print('TSFC of  '+str(sol(TSFC)))
