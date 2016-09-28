IDcount = 0

getUniqueID = function(){
	IDcount = IDcount + 1
	return IDcount
}



// Function for making primitive geometry, will likely be deprecated when meshing 
// comes in.
// Usage is new Geometry("rect",parentObj,xlen,ylen,zlen) or new Geometry("cyl",d,h)
Mesh = function(){
	type = arguments[0]
	parentObj = arguments[1]
	this.type = type
	this.volume = new Variable("volume"+parentObj.nameStr,"m^3")
	if (type=="rect"){
		this.xlen = new Variable("xlen"+parentObj.nameStr,arguments[2],"m")
		this.ylen = new Variable("ylen"+parentObj.nameStr,arguments[3],"m")
		this.zlen = new Variable("zlen"+parentObj.nameStr,arguments[4],"m")
	}
	if (type=="cyl"){
		this.d = new Variable("d"+parentObj.nameStr,arguments[2],"m")
		this.h = new Variable("h"+parentObj.nameStr,arguments[3],"m")
	}
	// if (type=="prop"){
		// this.d = arguments[0]
	// }
	
}

// // Define a plane from four points in 3D space
// Face  = function(xArr,yArr,zArr){
// 	this.xArr = xArr
// 	this.yArr = yArr
// 	this.zArr = zArr
// }

Position = function(parentObj,valDict){
	this.x = new Variable("xpos"+parentObj.nameStr,valDict.x,"m")
	this.y = new Variable("ypos"+parentObj.nameStr,valDict.y,"m")
	this.z = new Variable("zpos"+parentObj.nameStr,valDict.z,"m")

	if (valDict.x == undefined){
		this.x = new Variable("xpos"+parentObj.nameStr,"m")
	}
	if (valDict.y == undefined){
		this.y = new Variable("ypos"+parentObj.nameStr,"m")
	}
	if (valDict.z == undefined){
		this.z = new Variable("zpos"+parentObj.nameStr,"m")
	}
	console.log(this)
}

Rotation = function(parentObj,valDict){
	this.x = new Variable("xrot"+parentObj.nameStr,valDict.x,"degrees")
	this.y = new Variable("yrot"+parentObj.nameStr,valDict.y,"degrees")
	this.z = new Variable("zrot"+parentObj.nameStr,valDict.z,"degrees")

	if (valDict.x == undefined){
		this.x = new Variable("xrot"+parentObj.nameStr,"degrees")
	}
	if (valDict.y == undefined){
		this.y = new Variable("yrot"+parentObj.nameStr,"degrees")
	}
	if (valDict.z == undefined){
		this.z = new Variable("zrot"+parentObj.nameStr,"degrees")
	}
}

Geometry = function(mesh,position,rotation){
	this.mesh = mesh
	this.position = position
	this.rotation = rotation
	this.matesArr = []

	this.getFace = function(faceStr){
		if (faceStr=="z_upper"){
			var xArr = []
			var yArr = []
			var zArr = []
			xArr.push(this.position.x)
		}
	}
	this.getConstraints = function(){
		var constraints = []
		// constraints.push.apply(constraints,this.mesh.getConstraints())
		// console.log(this.matesArr)
		for(var i = 0; i<this.matesArr.length; i++){
			constraints.push.apply(constraints,this.matesArr[i].getConstraints())
		}
		return constraints;
	}
}

Mate = function(components,faces,points){
	//Array of components, length 2
	this.components = components

	//Array of faces strings of either "top" or "bottom"
	this.faces = faces 

	//Array of strings of "centroid"
	this.points = points

	this.getConstraints = function(){
		var constraintsArr = []
		face_one = this.faces[0]
		var comp1 = this.components[0]
		var comp2 = this.components[1]
		//Posynomial mate with some tolerance
		tol = 0.001
		lowtol = 1-tol
		hightol = 1+tol

		if (this.points[0]=='centroid'){
			overload(function(constraintsArr,comp1,comp2){
				constraintsArr.push(comp1.geometry.position.x >= lowtol*comp2.geometry.position.x,
					comp1.geometry.position.x <= hightol*comp2.geometry.position.x,
					comp1.geometry.position.y >= lowtol*comp2.geometry.position.y,
					comp1.geometry.position.y <= hightol*comp2.geometry.position.y)
			})(constraintsArr,comp1,comp2);

			if (this.faces[0]=="bottom" && this.faces[1]=="top"){
				overload(function(constraintsArr,comp1,comp2){
					constraintsArr.push(comp1.geometry.position.z >= lowtol*(comp2.geometry.position.z+0.5*comp1.geometry.mesh.zlen+0.5*comp2.geometry.mesh.zlen),
										comp1.geometry.position.z <= hightol*(comp2.geometry.position.z+0.5*comp1.geometry.mesh.zlen+0.5*comp2.geometry.mesh.zlen))
				})(constraintsArr,comp1,comp2);
			}
			if (this.faces[0]=="top" && this.faces[1]=="bottom"){
				overload(function(constraintsArr,comp1,comp2){
					constraintsArr.push(comp2.geometry.position.z >= lowtol*(comp1.geometry.position.z+0.5*comp1.geometry.mesh.zlen+0.5*comp2.geometry.mesh.zlen),
										comp2.geometry.position.z <= hightol*(comp1.geometry.position.z+0.5*comp1.geometry.mesh.zlen+0.5*comp2.geometry.mesh.zlen))
				})(constraintsArr,comp1,comp2);
			}
		}
		//Weird version built for ESC and arm constraint
		if(this.points[0]=="centroidR"){
			overload(function(constraintsArr,comp1,comp2){
				constraintsArr.push(
					comp1.geometry.rotation.z >= lowtol*comp2.geometry.rotation.z,
					comp1.geometry.rotation.z <= hightol*comp2.geometry.rotation.z,
					comp1.geometry.position.x >= lowtol*comp2.geometry.position.x,
					comp1.geometry.position.x <= hightol*comp2.geometry.position.x,
					comp1.geometry.position.y >= lowtol*comp2.geometry.position.y,
					comp1.geometry.position.y <= hightol*comp2.geometry.position.y,
					comp1.geometry.position.z >= lowtol*(centerPlate.geometry.position.z+0.5*comp2.geometry.mesh.zlen+0.5*comp1.geometry.mesh.zlen),
					comp1.geometry.position.z <= hightol*(centerPlate.geometry.position.z+0.5*comp2.geometry.mesh.zlen+0.5*comp1.geometry.mesh.zlen))
			})(constraintsArr,comp1,comp2)
		}
		//Custom mate for putting on motor
		if(this.points[0]=="motorMate"){
			overload(function(constraintsArr,comp1,comp2){
				constraintsArr.push(
					// comp1.geometry.rotation.z >= lowtol*comp2.geometry.rotation.z,
					// comp1.geometry.rotation.z <= hightol*comp2.geometry.rotation.z,
					comp1.geometry.position.x >= lowtol*(comp2.geometry.position.x),
					comp1.geometry.position.x <= hightol*(comp2.geometry.position.x),
					comp1.geometry.position.y >= lowtol*comp2.geometry.position.y,
					comp1.geometry.position.y <= hightol*comp2.geometry.position.y,
					comp1.geometry.position.z >= lowtol*(centerPlate.geometry.position.z+0.5*comp2.geometry.mesh.zlen+0.5*comp1.geometry.mesh.h),
					comp1.geometry.position.z <= hightol*(centerPlate.geometry.position.z+0.5*comp2.geometry.mesh.zlen+0.5*comp1.geometry.mesh.h))
			})(constraintsArr,comp1,comp2)
		}
		//Deal with arm joining constraint
		
		else{
			if (this.faces[0]=="smooth"&&this.faces[1]=="smooth"){
				if (this.points[0]=="lowerMidInc"){
					if (this.points[1] == 0){
						overload(function(constraintsArr,comp1,comp2){
						constraintsArr.push(comp1.geometry.position.x >= lowtol*(comp2.geometry.position.x+0.4*comp2.geometry.mesh.xlen+0.3535*comp1.geometry.mesh.xlen),
											comp1.geometry.position.x <= hightol*(comp2.geometry.position.x+0.4*comp2.geometry.mesh.xlen+0.3535*comp1.geometry.mesh.xlen),
											comp1.geometry.position.y >= lowtol*(comp2.geometry.position.y+0.4*comp2.geometry.mesh.ylen+0.3535*comp1.geometry.mesh.xlen),
											comp1.geometry.position.y <= hightol*(comp2.geometry.position.y+0.4*comp2.geometry.mesh.ylen+0.3535*comp1.geometry.mesh.xlen))
						})(constraintsArr,comp1,comp2);
					}
					if (this.points[1] == 1){
						overload(function(constraintsArr,comp1,comp2){
						constraintsArr.push(comp1.geometry.position.x >= lowtol*(comp2.geometry.position.x+0.4*comp2.geometry.mesh.xlen+0.3535*comp1.geometry.mesh.xlen),
											comp1.geometry.position.x <= hightol*(comp2.geometry.position.x+0.4*comp2.geometry.mesh.xlen+0.3535*comp1.geometry.mesh.xlen),
											comp2.geometry.position.y >= lowtol*(comp1.geometry.position.y+0.4*comp2.geometry.mesh.ylen+0.3535*comp1.geometry.mesh.xlen),
											comp2.geometry.position.y <= hightol*(comp1.geometry.position.y+0.4*comp2.geometry.mesh.ylen+0.3535*comp1.geometry.mesh.xlen))
						})(constraintsArr,comp1,comp2);
					}
					if (this.points[1] == 2){
						overload(function(constraintsArr,comp1,comp2){
						constraintsArr.push(comp2.geometry.position.x >= lowtol*(comp1.geometry.position.x+0.4*comp2.geometry.mesh.xlen+0.3535*comp1.geometry.mesh.xlen),
											comp2.geometry.position.x <= hightol*(comp1.geometry.position.x+0.4*comp2.geometry.mesh.xlen+0.3535*comp1.geometry.mesh.xlen),
											comp2.geometry.position.y >= lowtol*(comp1.geometry.position.y+0.4*comp2.geometry.mesh.ylen+0.3535*comp1.geometry.mesh.xlen),
											comp2.geometry.position.y <= hightol*(comp1.geometry.position.y+0.4*comp2.geometry.mesh.ylen+0.3535*comp1.geometry.mesh.xlen))
						})(constraintsArr,comp1,comp2);
					}

					if (this.points[1] == 3){
						overload(function(constraintsArr,comp1,comp2){
						constraintsArr.push(comp2.geometry.position.x >= lowtol*(comp1.geometry.position.x+0.4*comp2.geometry.mesh.xlen+0.3535*comp1.geometry.mesh.xlen),
											comp2.geometry.position.x <= hightol*(comp1.geometry.position.x+0.4*comp2.geometry.mesh.xlen+0.3535*comp1.geometry.mesh.xlen),
											comp1.geometry.position.y >= lowtol*(comp2.geometry.position.y+0.4*comp2.geometry.mesh.ylen+0.3535*comp1.geometry.mesh.xlen),
											comp1.geometry.position.y <= hightol*(comp2.geometry.position.y+0.4*comp2.geometry.mesh.ylen+0.3535*comp1.geometry.mesh.xlen))
						})(constraintsArr,comp1,comp2);
					}
				}
				
				overload(function(constraintsArr,comp1,comp2){
					constraintsArr.push(comp2.geometry.position.z >= lowtol*(comp1.geometry.position.z),
										comp2.geometry.position.z <= hightol*(comp1.geometry.position.z))
				})(constraintsArr,comp1,comp2);
			
			}
		}

		return constraintsArr
	}
}

//mmmm sweet recursion
updateObjProperties = function(obj,sol){
	if(obj instanceof Variable){
		// console.log(obj,'var')
		if(sol.getVal(obj)!='notConsideredInSolEqns'){
			obj.val = sol.getVal(obj)
		}
	}
	if(obj !== null && typeof obj === 'object' && !(obj instanceof Variable) && !(obj instanceof Mate)){
        // console.log(obj,'obj, not var')
        for (var propertyName in obj) {
    		if (obj.hasOwnProperty(propertyName)) {

    			updateObjProperties(obj[propertyName],sol)
    			
    		}
		}
    }
}

// updateComponentWithSol = function(component,sol){
// 	if (component instanceof Payload){
// 		for (var propertyName in component) {
//     		if (component.hasOwnProperty(propertyName)) {
//     			updateObjProperty(component[propertyName])
//     		}
// 		}
// 		component.geometry.position.x.val = sol.getVal(component.geometry.position.x)
// 	}
// }

Payload = function(){
	this.ID = getUniqueID()
	this.type = "payload"
	this.nameStr = this.type + this.ID.toString()
	this.mass = new Variable("mass"+this.nameStr,"kg")
	//Assemble geometry
	var mesh = new Mesh("rect",this,0.1,0.05,0.05)
	// position = new Position(this,0.1,0.05,0.05)
	var position = new Position(this,{})
	var rotation = new Rotation(this,{x:0,y:0,z:0})
	this.geometry = new Geometry(mesh,position,rotation)
	this.getConstraints = function(){

		var constraints = []
		overload(function(constraints,thisPlate){
			//Attachment constraint
			constraints.push.apply(constraints,thisPlate.geometry.getConstraints())
			
		})(constraints,this);
		return constraints;
	}
	// console.log(this)
}

Plate = function(){
	this.ID = getUniqueID()
	this.type = "plate"
	this.nameStr = this.type + this.ID.toString()
	this.mass = new Variable("mass"+this.nameStr,"kg")
	this.material = new Material()

	var mesh = new Mesh("rect",this,0.12,0.07,0.005)
	var position = new Position(this,{x:0.5,y:0.5,z:0.5})
	var rotation = new Rotation(this,{x:0,y:0,z:0})
	this.geometry = new Geometry(mesh,position,rotation)
	this.material = new Material()
	this.getConstraints = function(){

		var constraints = []
		overload(function(constraints,thisPlate){
			// console.log(thisPlate)
			// DEPRECATE DIRECT MESH REFERENCING
			// constraints.push.apply(constraints,thisPlate.geometry.mesh.getConstraints())
			// constraints.push(thisPlate.mass == thisPlate.geometry.mesh.volume*thisPlate.material.density)
		})(constraints,this);
		return constraints;
	}
	// console.log(this)
}

Beam = function(){
	this.ID = getUniqueID()
	this.type = "plate"
	this.nameStr = this.type + this.ID.toString()
	this.mass = new Variable("mass"+this.nameStr,"kg")
	this.material = new Material()

	var mesh = new Mesh("rect",this,0.1,0.1,0.1)
	var position = new Position(this,{x:0,y:0,z:0})
	var rotation = new Rotation(this,{x:0,y:0,z:0})
	this.geometry = new Geometry(mesh,position,rotation)
	this.getConstraints = function(){
		var constraints = []
		overload(function(constraints,thisBeam){
			constraints.push.apply(constraints,thisBeam.geometry.getConstraints())
		})(constraints,this);
		return constraints
	}
}

Material = function(){
	//by default we load up some magical ultralight material
	this.nameStr = "cf"
	this.density = new Variable("density"+this.nameStr,1,"kg/m^3")
}

Battery = function(){
	this.ID = getUniqueID()
	this.type = "battery"
	this.nameStr = this.type + this.ID.toString()
	this.energy = new Variable("energy"+this.nameStr,"J")
	this.specificEnergy = new Variable("specificEnergy"+this.nameStr,0.95e6,"J/kg")
	this.powerOutput = new Variable("powerOutput"+this.nameStr,10000,"W")
	this.mass = new Variable("mass"+this.nameStr)

	//Geometry
	var mesh = new Mesh("rect",this,0.04,0.06,0.03)
	var position = new Position(this,{})
	var rotation = new Rotation(this,{x:0,y:0,z:0})
	this.geometry = new Geometry(mesh,position,rotation)
	this.material = new Material()

	this.getConstraints = function(){
		var constraints = []
		overload(function(constraints,thisBatt){
			constraints.push.apply(constraints,thisBatt.geometry.getConstraints())
			constraints.push(thisBatt.energy <= thisBatt.mass*thisBatt.specificEnergy)
		})(constraints,this);
		return constraints
	}
}

SpeedController = function(){
	this.ID = getUniqueID()
	this.type = "speedController"
	this.nameStr = this.type + this.ID.toString()
	this.powerInput = new Variable("powerInput"+this.nameStr,"W")
	this.powerOutput = new Variable("powerOutput"+this.nameStr,"W")
	this.efficiency = new Variable("efficiency"+this.nameStr,0.9,"-")
	this.specificPower = new Variable("specificPower"+this.nameStr,1000,"W/kg")
	this.mass = new Variable("mass"+this.nameStr,"kg")

	//Geometry
	var mesh = new Mesh("rect",this,0.04,0.06,0.01)
	var position = new Position(this,{})
	var rotation = new Rotation(this,{x:0,y:0,z:0})
	this.geometry = new Geometry(mesh,position,rotation)
	this.material = new Material()
	
	this.getConstraints = function(){
		var constraints = []
		overload(function(constraints,thisController){
			// console.log(thisController)
			constraints.push.apply(constraints,thisController.geometry.getConstraints())
			constraints.push(//thisController.powerOutput <= thisController.powerInput*thisController.efficiency,
							 thisController.mass >= thisController.powerInput/thisController.specificPower)
		})(constraints,this);
		return constraints
	}
}

Motor = function(){
	this.ID = getUniqueID()
	this.type = "motor"
	this.nameStr = this.type + this.ID.toString()
	this.powerInput = new Variable("powerInput"+this.nameStr,"W")
	this.powerOutput = new Variable("powerOutput"+this.nameStr,"W")
	this.efficiency = new Variable("efficiency"+this.nameStr,0.9,"-")
	this.specificPower = new Variable("specificPower"+this.nameStr,500,"W/kg")
	this.mass = new Variable("mass"+this.nameStr,"kg")

	//Geometry
	var mesh = new Mesh("cyl",this,0.04,0.06)
	var position = new Position(this,{})
	var rotation = new Rotation(this,{x:0,y:0,z:0})
	this.geometry = new Geometry(mesh,position,rotation)
	this.material = new Material()

	this.getConstraints = function(){
		var constraints = []
		overload(function(constraints,thisMotor){
			// console.log(thisMotor)
			constraints.push.apply(constraints,thisMotor.geometry.getConstraints())
			constraints.push(thisMotor.powerOutput <= thisMotor.powerInput*thisMotor.efficiency,
							 thisMotor.mass >= thisMotor.powerInput/thisMotor.specificPower)
		})(constraints,this);
		return constraints
	}
}

Propeller = function(){
	this.ID = getUniqueID()
	this.type = "propeller"
	this.nameStr = this.type + this.ID.toString()
	this.powerInput = new Variable("powerInput"+this.nameStr,"W")
	this.thrustToPower = new Variable("thrustToPower"+this.nameStr,100,"N/W")
	this.thrust = new Variable("thrust"+this.nameStr,"N")
	this.getConstraints = function(){
		var constraints = []
		overload(function(constraints,thisProp){
			// console.log(thisProp)
			constraints.push(thisProp.thrust <= thisProp.thrustToPower*thisProp.powerInput)
		})(constraints,this);
		return constraints
	}
}