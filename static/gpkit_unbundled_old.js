//Global ID counter, used to assign a unique ID to each variable
ID = 0

//ID assignment function
assignID = function(){
    id = ID
    ID++;
    return id
}

//Variable object, derived from gpkit. ID property is hidden to the user, and is used for JSON indexing
Variable = function (...args) {
    // TODO: add readin for sweeps
    // Logic structure for reading in argumens is as follows:
    // The first element must be the name
    // After that, we may or may not get a value, so we check whether the next is a string or a number
    // If it is a string, we set units and leave value as undefined
    // If a number, we set value and then set units for the next arg, if there is one
    for (var i = 0; i < arguments.length; i++) {

        arg = arguments[i]
        if(i==0){
            this.name = arg
        }
        if(i==1){
            if (typeof arg == "number"){this.val = arg}
            if (typeof arg == "string"){this.units = arg}
        }
        if (i==2){
            if (typeof arguments[1] == "string"){
                this.label = arg
            }
            if (typeof arguments[1] == "number"){
                this.units = arg
            }
        }
        if (i==3){
            this.label = arg
        }
    }
    this.ID = assignID()
    this.__multiply = function (leftOperand) {
        return new Monomial([[this,1],[leftOperand,1]],1)
    };
    // this.__divide = function (leftOperand){

    // }
    this.__pow = function (leftOperand){
        console.log('pow works')
        return new Monomial([leftOperand,this],1)
    }
    this.__bitwiseXOR = function(leftOperand){
        console.log('bitwise xor power')
    }
    this.__lessThanEqual = function (leftOperand) {
        var inequality = new PosynomialInequality(leftOperand,'leq',this)
        return inequality
    };
    this.__greaterThanEqual = function (leftOperand) {
        var inequality = new PosynomialInequality(leftOperand,'geq',this)
        return inequality
    };
    // this.serialize = function () {
    //     return JSON.stringify(this);
    // };
};
Signomial = function(monomialsArr){
    //For each monomial we store its coefficient and then the monomial itself
    this.monomialsArr = monomialsArr
}
Monomial = function(expArr,constants){
    this.expArr = expArr
    this.constants = constants
    this.__greaterThanEqual = function (leftOperand) {
        var inequality = new PosynomialInequality(leftOperand,'geq',this)
        return inequality
    };
}
// Posynomial = function(){

// }
PosynomialInequality  = function(left,oper,right){
    this.left = left
    this.oper = oper
    this.right = right
    // Assemble the nested left and right sides into monomials or signomials
    this.assemble = function(){
        // Handle the left side
        this.assembleEquation(left)
        // Handle the right side
        this.assembleEquation(right)
    }
    this.assembleEquation = function(nestedPosynomial){
        if (nestedPosynomial instanceof Variable){
            this.left = Monomial
        }
        if (nestedPosynomial instanceof Signomial){
            for (var i = 0; i < nestedPosynomial.monomialsArr; i++) {

            }
        }
        if (nestedPosynomial instanceof Monomial){
            this.assembleMonomial(nestedPosynomial)
            // this.recursiveObjectTraverse(nestedPosynomial)
        }
    }
    this.assembleMonomial = function(monomial){
        /*Assemble a monomial with a nested expArr into a clean
        expArray.

        The simplest example is b*c*d

        After operator overloading, this is stored as [[[b,1],[c,1]],[d,1]]

        What we want is [[b,1],[c,1],[d,1]]

        The way we do it is to go through each element of the array recursively, and
        check whether it is an array, until we get down to a single 2D array (the 'expDict'
        of javascript) and we just extract that out and add it to the end array. This is a recursive process,
        because the equation can be as long, or as nested, as the user chooses.

        */
        console.log(monomial.expArr)
        result = this.flatten(monomial.expArr)
        console.log(result)
        for(var i = 0; i < result.length; i++) {
            dictLine = result[i]
            //Log out the variable and the power
            console.log(dictLine[0],dictLine[1])
        }

    }

    this.flatten = function flatten(ary) {
        var ret = [];
        for(var i = 0; i < ary.length; i++) {
            subArr = ary[i]
            console.log(subArr)
            if(subArr[0] instanceof Monomial) {
                console.log('found monomial, going deeper')
                ret = ret.concat(flatten(subArr[0].expArr));
            } else {
                ret.push(ary[i]);
            }
        }
        return ret;
    }
    this.recursiveObjectTraverse = function(obj){
        for (var k in obj)
        {
            if (typeof obj[k] == "object" && obj[k] !== null)
                console.log(obj[k])
                // if (obj[k] instanceof Monomial)
                //     console.log('picked up monomial')
                //     this.recursiveObjectTraverse(obj[k]);
            else
                console.log(obj,k,obj[k])
        }
    }
}

Model = function (cost,constraints){
    this.cost = cost
    this.constraints = constraints
    this.solution = new Solution()
    
    this.solve = function(target,callback){

        result = new Solution()
        sol = postData(this.serialize(),target).done(processReturnedSolJSON).done(function(){callback()})
        
    }

    this.serialize = function(){
        return JSON.stringify(this);
    }

}

function postData(data,target) {
    return $.ajax({
        url : target,
        data: data,
        type: 'POST',
    });
}


processReturnedSolJSON = function(response){
    parsedJSONObj = JSON.parse(response);
    sol = new Solution()
    sol.variables = parsedJSONObj.variables
    return sol
}

Solution = function(){
    this.variables = {}
}      
setupNums = function(){
    Number.prototype.__lessThanEqual = function (leftOperand) {
        var inequality = new PosynomialInequality(leftOperand,'leq',this)
        return inequality
    };
    Number.prototype.__greaterThanEqual = function (leftOperand) {
        var inequality = new PosynomialInequality(leftOperand,'geq',this)
        return inequality
    };
    Number.prototype.serialize = function () {
        return JSON.stringify(this)
    };
}

overload = require('operator-overloading')