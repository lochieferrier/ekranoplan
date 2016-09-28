var hemisphereLight, shadowLight;
var Colors = {
	//https://coolors.co/app/0a122a-274c77-6096ba-a3cef1-cdd6dd
	maastricht:0x0A122A,
	stpatricks:0x274c77,
	silverlake:0x6096ba,
	bbyblue:0xa3cef1,
	columbia:0xcdd6dd,
}

var ComponentColors = {
	battery:Colors.stpatricks,
	payload:Colors.silverlake,
	plate:Colors.maastricht,
	esc:Colors.bbyblue,
	motor:Colors.bbyblue,
	propellers:Colors.silverlake
}
setup3D = function(componentsArr,n_rotors){
	createScene();
	createLights();
	console.log(componentsArr)
	for(var i=0;i<componentsArr.length;i++){
		drawComponent(componentsArr[i])
	}
	drawQuad();
	// createArm();
	// createBattery();
	// createSpeedController();
	// createMotor();
	// createPropeller();
}

function createLights() {
	// A hemisphere light is a gradient colored light; 
	// the first parameter is the sky color, the second parameter is the ground color, 
	// the third parameter is the intensity of the light
	hemisphereLight = new THREE.HemisphereLight(0xaaaaaa,0x000000, .9)
	
	// A directional light shines from a specific direction. 
	// It acts like the sun, that means that all the rays produced are parallel. 
	shadowLight = new THREE.DirectionalLight(0xffffff, .9);

	// Set the direction of the light  
	shadowLight.position.set(150, 350, 350);
	
	// Allow shadow casting 
	shadowLight.castShadow = true;

	// define the visible area of the projected shadow
	shadowLight.shadow.camera.left = -400;
	shadowLight.shadow.camera.right = 400;
	shadowLight.shadow.camera.top = 400;
	shadowLight.shadow.camera.bottom = -400;
	shadowLight.shadow.camera.near = 1;
	shadowLight.shadow.camera.far = 1000;

	// define the resolution of the shadow; the higher the better, 
	// but also the more expensive and less performant
	shadowLight.shadow.mapSize.width = 2048;
	shadowLight.shadow.mapSize.height = 2048;
	
	// to activate the lights, just add them to the scene
	scene.add(hemisphereLight);  
	scene.add(shadowLight);
}

drawBoxOld = function(){
	//Inputs are color, then x,y,z dims, then x,y,z positioning, then rotation
	//Returns the rectangle object drawn, for reference by others
	geometry = new THREE.BoxGeometry( arguments[1], arguments[2],arguments[3]);
	material = new THREE.MeshPhongMaterial( { color: arguments[0],wireframe:true} );
	mesh = new THREE.Mesh( geometry, material );
	
	if(arguments.length > 4){
		mesh.position.set(arguments[4],arguments[5],arguments[6])
	}
	if(arguments.length > 7){
		mesh.rotation.set(arguments[7],arguments[8],arguments[9])
	}
	mesh.castShadow = true;
	mesh.receiveShadow = true;
	geometry.dynamic = true
	scene.add( mesh );
	return mesh;
}

drawCylOld = function(){
	//Inputs are color, then bottomradius,topradius,height,position(x,y,z) and then rotation(x,y,z)
		//Inputs are color, then x,y,z dims, then x,y,z positioning, then rotation
	//Returns the cyl object drawn, for reference by others
	geometry = new THREE.CylinderGeometry( arguments[1], arguments[2],arguments[3],10);
	material = new THREE.MeshPhongMaterial( { color: arguments[0]} );
	mesh = new THREE.Mesh( geometry, material );
	
	if(arguments.length > 4){
		mesh.position.set(arguments[4],arguments[5],arguments[6])
	}
	if(arguments.length > 7){
		mesh.rotation.set(arguments[7],arguments[8],arguments[9])
	}
	mesh.castShadow = true;
	mesh.receiveShadow = true;
	geometry.dynamic = true
	scene.add( mesh );
	return mesh;
}

drawBox = function(color,mesh,position,rotation){
	//Inputs are color, then mesh, position,rotation
	//Returns the rectangle object drawn, for reference by others
	geometry = new THREE.BoxGeometry( mesh.xlen.val, mesh.ylen.val,mesh.zlen.val);
	material = new THREE.MeshPhongMaterial( { color: color} );
	mesh = new THREE.Mesh( geometry, material );
	mesh.position.set(position.x.val,position.y.val,position.z.val)
	mesh.rotation.set(rotation.x.val,rotation.y.val,rotation.z.val)
	mesh.castShadow = true;
	mesh.receiveShadow = true;
	geometry.dynamic = true
	scene.add( mesh );
	return mesh;
}


drawCyl = function(color,mesh,position,rotation){
	//Inputs are color, then mesh, position,rotation
	//Returns the cylinder object drawn, for reference by others
	geometry = new THREE.CylinderGeometry( mesh.d.val*0.5,mesh.d.val*0.5,mesh.h.val,10);
	material = new THREE.MeshPhongMaterial( { color: color} );
	mesh = new THREE.Mesh( geometry, material );
	mesh.position.set(position.x.val,position.y.val,position.z.val)
	mesh.rotation.set(rotation.x.val,rotation.y.val,rotation.z.val)
	mesh.castShadow = true;
	mesh.receiveShadow = true;
	geometry.dynamic = true
	scene.add( mesh );
	return mesh;
}


drawComponent = function(component){

	if (component instanceof Payload){
		drawBox(ComponentColors.payload,component.geometry.mesh,component.geometry.position,component.geometry.rotation)
	}
	if (component instanceof Plate){
		drawBox(ComponentColors.plate,component.geometry.mesh,component.geometry.position,component.geometry.rotation)
	}
	if (component instanceof Beam){
		console.log('drawing beam')
		drawBox(ComponentColors.plate,component.geometry.mesh,component.geometry.position,component.geometry.rotation)
	}
	if (component instanceof Battery){
		drawBox(ComponentColors.battery,component.geometry.mesh,component.geometry.position,component.geometry.rotation)
	}
	if (component instanceof SpeedController){
		drawBox(ComponentColors.esc,component.geometry.mesh,component.geometry.position,component.geometry.rotation)
	}

	if (component instanceof Motor){
		drawCyl(ComponentColors.motor,component.geometry.mesh,component.geometry.position,component.geometry.rotation)
	}

}

drawQuad = function(){

	console.log('drawquad')
	plateThickness = 0.003;
	n_rotors = 4;
	l_plate = 0.1

	// Draw the center plate
	centerPlateBox = drawBoxOld(ComponentColors.plate,l_plate,l_plate,plateThickness)

	// Draw the battery
	batteryHeight = 0.05
	batteryBox = drawBoxOld(ComponentColors.battery,0.1,0.05,batteryHeight,0,0,plateThickness+batteryHeight/2)

	//Draw the payload
	payloadHeight = 0.05
	payloadBox = drawBoxOld(ComponentColors.payload,0.1,0.05,payloadHeight,0,0,-(plateThickness+payloadHeight/2))

	//Draw the arms
	l_arm = 0.15
	armShift = 0.1 //Fraction of arm shifted in over plate
	armShiftOut = 0.5-armShift
	flpXList = [1,1,-1,-1]
	flpYList = [1,-1,-1,1]
	armAngleList = [135,-135,-45,45]
	armGeomArr = []
	for(var i = 0; i < n_rotors; i++){
		//Set the geometry polarity based on which number arm we are on

		flpX = flpXList[i]
		flpY = flpYList[i]

		armAngle = armAngleList[i]
		armRect = drawBoxOld(ComponentColors.plate,0.02,l_arm,plateThickness,flpX*(l_plate*0.5+l_arm*armShiftOut*Math.cos(Math.radians(45))),flpY*(l_plate*0.5+l_arm*armShiftOut*Math.cos(Math.radians(45))),0,0,0,Math.radians(armAngle))

		armGeomArr.push(armRect)

	}

	//Draw the speed controllers
	for(var i = 0; i < n_rotors; i++){
		console.log(armGeomArr[i].position.x)
		armRect = armGeomArr[i]
		contrHeight = 0.005;
		contrRect = drawBoxOld(ComponentColors.esc,0.02,0.04,contrHeight,armRect.position.x,armRect.position.y,(plateThickness+contrHeight/2),0,0,armRect.rotation.z)
	}

	//Draw the motors
	motorHeight = 0.02
	flpList = [1,-1,1,1]
	motorGeomArr = []
	for(var i = 0; i < n_rotors; i++){
		armRect = armGeomArr[i]
		contrHeight = 0.005;
		flp = flpList[i]
		motorCyl = drawCylOld(ComponentColors.motor,0.02,0.02,motorHeight)
		if (i!=1 && i!=3){
			motorCyl.position.set(armRect.position.x+flp*0.5*l_arm*Math.sin(armRect.rotation.z),armRect.position.y+flp*0.5*l_arm*Math.sin(armRect.rotation.z),(plateThickness+motorHeight/2));
		}
		else{
			motorCyl.position.set(armRect.position.x-flp*0.5*l_arm*Math.sin(Math.radians(45)),armRect.position.y+flp*0.5*l_arm*Math.sin(Math.radians(45)),(plateThickness+motorHeight/2));
		}
		motorCyl.rotateX(Math.radians(90))
		motorGeomArr.push(motorCyl)

	}

// 	//Make propellers
	aoa = 10
	shaftRadius = 0.005
	shaftLen = 0.015
	chord = 0.02
	diameter = 0.2
	thicknessToChordRatio = 0.1 //Thickness to chord ratio
	thickness = chord*thicknessToChordRatio
	for(var i = 0; i < n_rotors; i++){
		motorCyl = motorGeomArr[i]
		contrHeight = 0.005;
		flp = flpList[i]

		// //Make shaft
		// geometry = new THREE.CylinderGeometry(shaftRadius,shaftRadius,shaftLen,10);
		// material = new THREE.MeshBasicMaterial( { color: 0x55b4f4} );
		// propShaft = new THREE.Mesh( geometry, material );
		propShaft = drawCylOld(ComponentColors.propellers,shaftRadius,shaftRadius,shaftLen);
		propShaft.rotateX(Math.radians(90))
		propShaft.position.set(motorCyl.position.x,motorCyl.position.y,motorHeight+shaftLen/2)
		scene.add( propShaft );
		
		//Make blade
		for(var j=0; j<2;j++){
			bladeRect = drawBoxOld(ComponentColors.propellers,chord,diameter/2,thickness)
			
			if(j==0){
				flp=-1;
			}
			else{
				flp =1;
			}
			bladeRect.rotateY(Math.radians(flp*aoa))
			bladeRect.position.set(propShaft.position.x,propShaft.position.y+flp*diameter/4,propShaft.position.z+shaftLen/2);
			scene.add( bladeRect );

		}
		//Make spinner
		var geometry = new THREE.SphereGeometry( shaftRadius*1.5, 10, 10, Math.PI, Math.PI, 3*Math.PI/2);
		var material = new THREE.MeshPhongMaterial( { color: ComponentColors.propellers} );
		spinnerHemi = new THREE.Mesh( geometry, material );
		spinnerHemi.material.side = THREE.DoubleSide;
		spinnerHemi.rotateX(Math.radians(90))
		spinnerHemi.position.set(propShaft.position.x,propShaft.position.y,propShaft.position.z+shaftLen*0.5)
		scene.add( spinnerHemi );

	}


}
createScene = function(){
	scene = new THREE.Scene();
	HEIGHT = window.innerHeight;
	WIDTH = window.innerWidth;
	// Create the camera
	aspectRatio = WIDTH / HEIGHT;
	fieldOfView = 60;
	nearPlane = 0.001;
	farPlane = 10000;
	camera = new THREE.PerspectiveCamera(
		fieldOfView,
		aspectRatio,
		nearPlane,
		farPlane
	);
	// Set the position of the camera
	camera.position.x = 0.5;
	camera.position.y = 0.5;
	camera.position.z = 1;
	
	
	// camera.up = new THREE.Vector3(0,0,0);

	renderer = new THREE.WebGLRenderer({
			// Allow transparency to show the gradient background
		// we defined in the CSS
		alpha: true,
		antialias: true}
	);
	renderer.setSize( window.innerWidth/1, window.innerHeight/1 );
	// renderer.setClearColor( 0xffffff );
	container = document.getElementById('threedview');
	container.appendChild(renderer.domElement);
	
	controls = new THREE.TrackballControls( camera,renderer.domElement );

	
}

drawPayload = function(payload){
	geometry = new THREE.BoxGeometry( 10, 10, 10 );
	material = new THREE.MeshBasicMaterial( { color: 0x33b4f4} );
	cube = new THREE.Mesh( geometry, material );
	geometry.dynamic = true
	scene.add( cube );
}
update3DModel = function(componentsArr){
	// for (i = 0; i < componentsArr.length; i++) { 
 //    	text += cars[i] + "<br>";
	// }
	// cube.geometry.verticesNeedUpdate = true;
	// cube.geometry.normalsNeedUpdate = true;
}
render = function () {
	requestAnimationFrame( render );
	controls.update()
	// changes to the vertices


	renderer.render(scene, camera);
};

// Converts from degrees to radians.
Math.radians = function(degrees) {
  return degrees * Math.PI / 180;
};
 
// Converts from radians to degrees.
Math.degrees = function(radians) {
  return radians * 180 / Math.PI;
};