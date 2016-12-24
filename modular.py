"""Modular aircraft concept"""
import numpy as np
from gpkit import Model, Variable, Vectorize

class Ekranoplan(Model):
    "The vehicle model"
    def setup(self):
        self.fuse = Fuselage()
        self.engine = Engine()
        self.propeller = Propeller()
        self.wing = Wing()
        self.fuel = Fuel()
        self.components = [self.fuse, self.engine, self.propeller, self.wing]

        W = Variable("W", "N", "weight")
        self.weight = W

        return self.components, [
            W >= sum(c["W"] for c in self.components)
        ]

    def dynamic(self, state):
        "This component's performance model for a given state."
        return EkranoplanP(self, state)


class EkranoplanP(Model):

    def setup(self, aircraft, state):
        self.aircraft = aircraft
        self.wing_aero = aircraft.wing.dynamic(state)
        self.propeller_p = aircraft.propeller.dynamic(state)
        self.engine_p = aircraft.engine.dynamic(state)
        self.perf_models = [self.wing_aero,self.propeller_p]

        Wfuel = Variable("W_{fuel}", "N", "fuel weight")
        Wburn = Variable("W_{burn}", "N", "segment fuel burn")
        R = Variable("R","m","Breguet range")
        z_bre = Variable("z_bre","-","Breguet range parameter")
        L = Variable("L","N","lift")
        return self.perf_models, [
            aircraft.weight + Wfuel <= (0.5*state["\\rho"]*state["V"]**2
                                        * self.wing_aero["C_L"]
                                        * aircraft.wing["S"]),
            L <= (0.5*state["\\rho"]*state["V"]**2
                                        * self.wing_aero["C_L"]
                                        * aircraft.wing["S"]),
            Wburn >= 0.1*self.wing_aero["D"],
            self.propeller_p["T"] >= self.wing_aero["D"],
            z_bre >= (state['g']*R*self.propeller_p['T'])/(self.aircraft.fuel['h']*1*(L)),
            (Wfuel/aircraft.weight) >= z_bre + (z_bre**2)/2 + (z_bre**3)/6 + (z_bre**4)/24,
            state["engineShaftP"] <= self.engine_p["P"]

        ]


class FlightState(Model):
    "Context for evaluating flight physics"
    def setup(self):
        Variable("V", 40, "m/s", "true airspeed")
        Variable("\\mu", 1.628e-5, "N*s/m^2", "dynamic viscosity")
        Variable("\\rho", 0.74, "kg/m^3", "air density")
        Variable("mdot",4,"kg/s","fuel flow rate")
        Variable("engineShaftP",20,"W","engine shaft power")
        Variable("g",9.8,"m/s/s","acceleration due to gravity")


class FlightSegment(Model):
    "Combines a context (flight state) and a component (the aircraft)"
    def setup(self, ekranoplan):
        self.flightstate = FlightState()
        self.ekranoplanp = ekranoplan.dynamic(self.flightstate)
        return self.flightstate, self.ekranoplanp


class Mission(Model):
    "A sequence of flight segments"
    def setup(self, aircraft):
        with Vectorize(4):  # four flight segments
            fs = FlightSegment(aircraft)

        Wburn = fs.ekranoplanp["W_{burn}"]
        Wfuel = fs.ekranoplanp["W_{fuel}"]
        rangeHelper = fs.ekranoplanp["R"]

        self.R = rangeHelper[-1]
        self.takeoff_fuel = Wfuel[0]
        return fs, [Wfuel[:-1] >= Wfuel[1:] + Wburn[:-1],
                    Wfuel[-1] >= Wburn[-1],
                    rangeHelper[:-1] >= rangeHelper[1:],
                    rangeHelper[-1] >= rangeHelper[0]]


class Wing(Model):
    "Aircraft wing model"
    def dynamic(self, state):
        "Returns this component's performance model for a given state."
        return WingAero(self, state)

    def setup(self):
        W = Variable("W", "N", "weight")
        S = Variable("S", 190, "m^2", "surface area")
        rho = Variable("\\rho", 1, "N/m^2", "areal density")
        A = Variable("A", 27, "-", "aspect ratio")
        c = Variable("c", "m", "mean chord")

        return [W >= S*rho,
                c == (S/A)**0.5]


class WingAero(Model):
    "Wing aerodynamics"
    def setup(self, wing, state):
        CD = Variable("C_D", "-", "drag coefficient")
        CL = Variable("C_L", "-", "lift coefficient")
        e = Variable("e", 0.9, "-", "Oswald efficiency")
        Re = Variable("Re", "-", "Reynold's number")
        D = Variable("D", "N", "drag force")

        return [
            CD >= (0.074/Re**0.2 + CL**2/np.pi/wing["A"]/e),
            Re == state["\\rho"]*state["V"]*wing["c"]/state["\\mu"],
            D >= 0.5*state["\\rho"]*state["V"]**2*CD*wing["S"],
        ]


class Fuselage(Model):
    "The thing that carries the fuel, engine, and payload"
    def setup(self):
        # fuselage needs an external dynamic drag model,
        # left as an exercise for the reader
        # V = Variable("V", 16, "gal", "volume")
        # d = Variable("d", 12, "in", "diameter")
        # S = Variable("S", "ft^2", "wetted area")
        # cd = Variable("c_d", .0047, "-", "drag coefficient")
        # CDA = Variable("CDA", "ft^2", "drag area")
        Variable("W", 100, "N", "weight")

class FuselageAero(Model):
    def setup(self):
        Variable("D",100,'N',"Drag")


class Engine(Model):
    def setup(self):
        Variable("W",30,'N',"Weight")
        Variable("maxBSFC",1.4359644493044238e-07,"kg/W/s","maximum brake specfic fuel consumption")
        Variable("maxP",35e3,"W","Maximum power of engine")
        self.fuel = Fuel()

    def dynamic(self,state):
        return EngineP(self,state)

class EngineP(Model):
    def setup(self,engine,state):
        # Simple fuel flow vs power output model
        P = Variable("P",35e3,"W","Power")

        return [P <= state["mdot"]/engine["maxBSFC"],
                P <= engine["maxP"]];

class Fuel(Model):
    def setup(self):
        Variable("h",42.448e6,"J/kg","Specific heat")
        Variable("rho",719.7, 'kg/m^3',"Density")

class Propeller(Model):
    def setup(self):
        Variable("W",10,'N',"Weight")
        Variable("powerToThrust",25 ,"N/W","Power to thrust ratio")

    def dynamic(self,state):
        return PropellerP(self,state)

class PropellerP(Model):
    def setup(self,propeller,state):
        T = Variable("T","N","Thrust")
        return [T <= propeller["powerToThrust"]*state["engineShaftP"]]

AC = Ekranoplan()
MISSION = Mission(AC)
objective = 1/MISSION.R
M = Model(objective, [MISSION, AC])
M.debug()
SOL = M.solve(verbosity=0)
print SOL.table()