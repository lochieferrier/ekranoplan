"""Modular aircraft concept"""
import numpy as np
from gpkit import Model, Variable, Vectorize

class Aircraft(Model):
    "The vehicle model"
    def setup(self):
        self.hull = Hull()
        self.wing = Wing()
        self.engine = Engine()
        self.propeller = Propeller()
        self.pilot = Pilot()
        self.components = [self.hull, self.engine, self.propeller, self.wing, self.pilot]

        W = Variable("W", "N", "weight")
        self.weight = W
        n_0 = Variable("n_0",0.8,"-") #Should belong to ekranoplan
        h_fuel = Variable("h_fuel",100,"J/kg") #Should belong to ekranoplan
        return self.components, [
            W >= sum(c["W"] for c in self.components)
            ]

    def dynamic(self, state):
        "This component's performance model for a given state."
        return AircraftP(self, state)

class AircraftP(Model):
    "Aircraft flight physics: weight <= lift, fuel burn"
    def setup(self, aircraft, state):
        self.aircraft = aircraft
        self.wing_aero = aircraft.wing.dynamic(state)
        self.engine_p = aircraft.engine.dynamic(state)
        self.propeller_p = aircraft.propeller.dynamic(state)

        self.perf_models = [self.wing_aero,self.engine_p,self.propeller_p]
        Wfuel = Variable("W_{fuel}", "N", "fuel weight")
        Wburn = Variable("W_{burn}", "N", "segment fuel burn")

        return self.perf_models, [
            aircraft.weight + Wfuel <= (0.5*state["\\rho"]*state["V"]**2
                                        * self.wing_aero["C_L"]
                                        * aircraft.wing["S"]),
            self.propeller_p['P_in'] == self.engine_p.P,
            Wburn >= 0.01*self.wing_aero["D"],
            self.propeller_p["T"] >= self.wing_aero["D"]
        ]

class FlightState(Model):
    "Context for evaluating flight physics"
    def setup(self):
        Variable("V","m/s", "true airspeed")
        Variable("\\mu", 1.628e-5, "N*s/m^2", "dynamic viscosity")
        Variable("\\rho", 0.74, "kg/m^3", "air density")
        Variable("g", 9.8, "m/s/s", "gravity")

class FlightSegment(Model):
    "Combines a context (flight state) and a component (the aircraft)"
    def setup(self, aircraft):
        self.flightstate = FlightState()
        self.aircraftp = aircraft.dynamic(self.flightstate)
        return self.flightstate, self.aircraftp


class Mission(Model):
    "A sequence of flight segments"
    def setup(self, aircraft):
        with Vectorize(4):  # four flight segments
            fs = FlightSegment(aircraft)

        Wburn = fs.aircraftp["W_{burn}"]
        Wfuel = fs.aircraftp["W_{fuel}"]
        self.takeoff_fuel = Wfuel[0]
        self.range = Variable("Range","m")
        self.z_bre = Variable("z_bre","-")
        return fs, [Wfuel[:-1] >= Wfuel[1:] + Wburn[:-1],
                    Wfuel[-1] >= Wburn[-1],
                    self.z_bre >= (fs.flightstate["g"]*self.range*fs.aircraftp.wing_aero["D"])/(aircraft["h_fuel"]*aircraft["n_0"]*aircraft.weight),
                    Wfuel[0]/aircraft.weight >= self.z_bre + (self.z_bre**2)/2 + (self.z_bre**3)/6 + (self.z_bre**4)/24]

class Wing(Model):
    "Aircraft wing model"

    def setup(self):
        W = Variable("W", "N", "weight")
        S = Variable("S", 190, "m^2", "surface area")
        rho = Variable("\\rho", 1, "N/m^2", "areal density")
        A = Variable("A", 27, "-", "aspect ratio")
        c = Variable("c", "m", "mean chord")

        return [W >= S*rho,
                c == (S/A)**0.5]
    def dynamic(self, state):
        "Returns this component's performance model for a given state."
        return WingAero(self, state)


class WingAero(Model):
    "Wing aerodynamics"
    def setup(self, wing, state):
        CD = Variable("C_D", "-", "drag coefficient")
        CL = Variable("C_L", "-", "lift coefficient")
        e = Variable("e", 0.9, "-", "Oswald efficiency")
        Re = Variable("Re", "-", "Reynold's number")
        D = Variable("D", "lbf", "drag force")

        return [
            CD >= (0.074/Re**0.2 + CL**2/np.pi/wing["A"]/e),
            Re == state["\\rho"]*state["V"]*wing["c"]/state["\\mu"],
            D >= 0.5*state["\\rho"]*state["V"]**2*CD*wing["S"],
            ]


class Hull(Model):
    "The thing that carries the fuel, engine, and payload"
    def setup(self):
        # fuselage needs an external dynamic drag model,
        # left as an exercise for the reader
        # V = Variable("V", 16, "gal", "volume")
        # d = Variable("d", 12, "in", "diameter")
        # S = Variable("S", "ft^2", "wetted area")
        # cd = Variable("c_d", .0047, "-", "drag coefficient")
        # CDA = Variable("CDA", "ft^2", "drag area")
        Variable("W", 101.99, "N", "weight")

class Engine(Model):
    def setup(self):
        W = Variable("W",421.4,"N","weight")
        P_max = Variable("P_max",10000,"W","max engine power output")
        BSFC_min = Variable("BSFC_min",1.4359644493044238e-07,"kg/W/s","maximum brake specfic fuel consumption")
    def dynamic(self,state):
        return EngineP(self,state)

class EngineP(Model):
    def setup(self,engine,state):
        mdot = Variable("mdot",10,"kg/s","fuel mass flow")
        self.P = Variable("P","W","engine power output")
        return [self.P <= mdot/engine["BSFC_min"],
                self.P <= engine["P_max"]]

class Propeller(Model):
    def setup(self):
        W = Variable("W",20,"N","weight")
        D = Variable("D",1.5,"m","Diameter")
        eta = Variable("eta",100,"N/W","BS thrust to power ratio for prop")
    def dynamic(self,state):
        return PropellerP(self,state)

class PropellerP(Model):
    def setup(self,propeller,state):
        # What the hell is a?
        a = 0.8
        T = Variable("T","N","thrust")
        f = Variable("f","1/s","frequency")
        P_in = Variable("P_in","W","power input")
        n = Variable("n",0.8,"-","efficiency")
        J = Variable("J","-","advance ratio")
        return [J <= state['V']/(f*propeller["D"]),
                f <= Variable("f",45,"1/s","prop speed limit"),
                n <= a*J,
                T<= P_in*n/state['V']]

class Pilot(Model):
    def setup(self):
        W = Variable("W",735,"N","weight")


AC = Aircraft()
MISSION = Mission(AC)
M = Model(1/MISSION.range, [MISSION, AC])
M.debug()
SOL = M.solve(verbosity=0)
print SOL.table()