//#region Global variables
let canvas = document.getElementById('canvas');
let ctx = canvas.getContext('2d');
const red = 'rgb(255, 70, 70)';
const green = 'rgb(0, 175, 0)';
const blue = 'rgb(0, 0, 255)';
const black = 'rgb(20, 20, 20)';

let objects = [];
let targets = [];
//#endregion

//#region Classes

class Turret{
    constructor(x, y){
        this.x = x;
        this.y = y;
        this.r1 = 35;
        this.r2 = 25;
        this.cannonLength = 50;
        this.cannonWidth = 6;
        this.locked = false;
        this.loaded = true;
        this.reloadTime = 50;
        this.rotation = 90;
        this.rotationSpeed = 17;
    }

    draw(){
        
        //Draw body
        this.drawBody();

        //Draw cannon
        ctx.beginPath();
        ctx.fillStyle = black;

        //If there are any targets
        if (targets.length > 0){

            //Find a target
            if (!this.locked){

                //#region Choose target

                let bestDiff = 181;
                let nearestTargetIndex = 0;
                let t, diff;

                //Loop through all targets and find the nearest target(that requires the least amount of rotation)
                for (let i = 0; i < targets.length; i++){

                    t = targets[i];
                    let angle = getAngle(this.x, this.y, t.x, t.y);

                    //Calculate the difference between the current rotation and the target's angle
                    diff = Math.abs(this.rotation - angle);
                    
                    //If the difference between the current rotation and the new angle is > 180, subtract 360 from the difference
                    if (diff > 180){
                        diff = Math.abs(diff - 360);
                    }

                    if (bestDiff > diff){
                        bestDiff = diff;
                        nearestTargetIndex = i;
                    }
                }

                t = targets[nearestTargetIndex];

                //#endregion

                //The angle from the turret to the target
                let angle = getAngle(this.x, this.y, t.x, t.y);

                //#region Rotate cannon

                //If the rotation is more than half a circle
                if (Math.abs(this.rotation - angle) > 180){

                    //Go counter-clockwise
                    if (angle > this.rotation){
                        this.rotation -= this.rotationSpeed;
                        angle -= 360;
                    }
                    
                    //Go clockwise
                    else{
                        this.rotation += this.rotationSpeed;
                        angle += 360;
                        
                    }
                }

                else{
                    angle < this.rotation ? this.rotation -= this.rotationSpeed : this.rotation += this.rotationSpeed;
                }

                //#endregion

                //Draw the cannon
                this.drawCannon();

                //Lock on
                if (Math.abs(this.rotation - angle) <= this.rotationSpeed){
                    this.locked = true;
                    this.target = t;
                }

                return;
            }

            //Shoot the target
            if (this.locked && this.loaded){
                this.fire();   
            }
        }

        this.drawCannon();
    }

    drawBody(){

        //Outer circle
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r1, 0, Math.PI*2, true);
        ctx.fillStyle = green;
        ctx.fill();
        ctx.closePath();

        //Inner circle
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r2, 0, Math.PI*2, true);
        ctx.fillStyle = red;
        ctx.fill();
        ctx.closePath();
    }

    drawCannon(){
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate((this.rotation - 180) * Math.PI/180);
        ctx.translate(this.x*-1, this.y*-1);
        ctx.fillRect(this.x, this.y, this.cannonLength, this.cannonWidth);
        ctx.closePath();
        ctx.restore();
    }

    fire(){
        this.loaded = false;
        setTimeout(() => {
            this.loaded = true;
        }, this.reloadTime);

        //Spawn projectile
        let p = new Projectile(this.x, this.y, this.target.x, this.target.y, this.target);
        p.turret = this;

        //Sounds
        let a = new Audio('/Sounds/M1.wav');
        a.play();
        objects.push(p);

        //Check for negative angle
        if (this.rotation < 0){
            this.rotation += 360;
        }

        else if (this.rotation > 360){
            this.rotation -= 360;
        }
        console.log(this.rotation);

    }
}

class Target{
    constructor(x, y){
        this.x = x;
        this.y = y;
        this.r = 10;
        this.hp = 1;
    }

    draw(){
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI*2, false);
        ctx.fillStyle = red;
        ctx.fill();
        ctx.closePath();
    }
}

class Projectile{
    constructor(x,y, targetX, targetY, target){
        this.x = x;
        this.y = y;
        this.targetX = targetX;
        this.targetY = targetY;
        this.target = target;
        this.speed = 25;
        this.r = 2;
        this.distance = Math.sqrt( (x - targetX)*(x - targetX) + (y - targetY)*(y - targetY));
        this.normalizedX = (x-targetX)/ this.distance;
        this.normalizedY = (y-targetY)/ this.distance;
        this.dx = this.normalizedX * this.speed * -1;
        this.dy = this.normalizedY * this.speed * -1;
        this.margin = 30;
        this.selfDestructTimer = setTimeout(() => {
            this.selfDestruct();
        },2000);
    }

    draw(){

        this.x += this.dx;
        this.y += this.dy;

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI*2, true);
        ctx.fillStyle = black;
        ctx.fill();
        ctx.closePath();

        if (targets.length == 0){
            return;
        }

        //Hit detection
        for (let i = 0; i < targets.length; i++){
            let t = targets[i];
            if (Math.abs(this.x - t.x) <= this.margin && Math.abs(this.y - t.y) <= this.margin){
                this.hit(t);
                return;
            }
        }
    }
        
    hit(target){

        //Stop self-destruction sequence
        clearTimeout(this.selfDestructTimer);

        //Damage target
        target.hp--;

        //Eliminate target
        if (target.hp <= 0){
            objects.splice(objects.indexOf(target), 1);
            targets.splice(targets.indexOf(target), 1);
            this.turret.locked = false;
        }

        //Destroy 
        this.selfDestruct();
    }

    selfDestruct(){
        objects.splice(objects.indexOf(this), 1);
    }
}

//#endregion

//#region Helper Functions

//onClick listener
canvas.addEventListener('click', e => {
    let t = new Target(e.clientX, e.clientY);
    objects.push(t);
    targets.push(t);
    //console.log(getAngle(objects[0].x, objects[0].y, t.x, t.y));
    
});

//Get the angle of two points
function getAngle(x1,y1, x2,y2){
    let opposite = (y2-y1);
    let adjacent = (x2-x1);
    let angle = parseInt((Math.atan2(opposite, adjacent) * 180 / Math.PI).toFixed(0)) + 180;
    return angle;
}

//Draw animation frame function, called every frame
function draw(){

    requestAnimationFrame(draw);
    
    //Draw green background
    ctx.fillStyle = 'rgb(95, 255, 95)';
    ctx.fillRect(0,0, canvas.width, canvas.height);

    //Draw objects
    objects.forEach(obj => {
        obj.draw();
    });
}

//Main method
function start(){
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    let turret = new Turret(650, 350);
    objects.push(turret);
    draw();
}
//#endregion

//start();
setInterval(() => {

    let x = Math.random() * canvas.width;
    let y = Math.random() * canvas.height;
    let t = new Target(x, y);
    objects.push(t);
    targets.push(t);

}, 500);