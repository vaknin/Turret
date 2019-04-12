//#region Global variables
let canvas = document.getElementById('canvas');
let ctx = canvas.getContext('2d');
const red = 'rgb(255, 0, 0)';
const black = 'rgb(0, 0, 0)';
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
        this.locked = false;
        this.loaded = true;
        this.reloadTime = 600;
        this.rotation = 270;
        this.rotationSpeed = 1;
    }

    draw(){
        this.drawBody();

        //Draw cannon
        ctx.beginPath();
        ctx.fillStyle = black;

        //Calculate angle from turret to target
        if (targets.length > 0){
            
            //#region Choose nearest target

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

            let angle = getAngle(this.x, this.y, t.x, t.y);

            //Rotate cannon
            if (!this.locked){

                //#region Rotation direction
                //Avoid rotating more than 180deg at a time
                if (this.rotation - angle > 180){
                    angle < this.rotation ? this.rotation += this.rotationSpeed : this.rotation -= this.rotationSpeed;
                    angle += 360;
                }

                else if (angle - this.rotation > 180){
                    angle < this.rotation ? this.rotation += this.rotationSpeed : this.rotation -= this.rotationSpeed;
                    angle -= 360;
                }

                else{
                    angle < this.rotation ? this.rotation -= this.rotationSpeed : this.rotation += this.rotationSpeed;
                }

                //#endregion

                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.rotate((this.rotation - 180) * Math.PI/180);
                ctx.translate(this.x*-1, this.y*-1);
                ctx.fillRect(this.x, this.y, 45, 7.5);
                ctx.closePath();
                ctx.restore();

                //Lock on
                if (this.rotation == angle){
                    this.locked = true;
                }

                return;
            }

            //Shoot the target
            if (this.locked && this.loaded){
                this.loaded = false;
                setTimeout(() => {
                    this.loaded = true;
                }, this.reloadTime);

                let b = new Bullet(this.x, this.y, t.x, t.y, t);
                b.turret = this;
                objects.push(b);
            }
        }

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate((this.rotation - 180) * Math.PI/180);
        ctx.translate(this.x*-1, this.y*-1);
        ctx.fillRect(this.x, this.y, 45, 7.5);
        ctx.closePath();
        ctx.restore();
    }

    drawBody(){

        //Inner circle
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r1, 0, Math.PI*2, true);
        ctx.fillStyle = 'rgb(35, 35, 35)';
        ctx.fill();
        ctx.closePath();

        //Outer circle
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r2, 0, Math.PI*2, true);
        ctx.fillStyle = 'rgb(25, 25, 225)';
        ctx.fill();
        ctx.closePath();
    }
}

class Target{
    constructor(x, y){
        this.x = x;
        this.y = y;
        this.r = 10;
        this.hp = 3;
    }

    draw(){
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI*2, false);
        ctx.fillStyle = red;
        ctx.fill();
        ctx.closePath();
    }
}

class Bullet{
    constructor(x,y, targetX, targetY, target){
        this.x = x;
        this.y = y;
        this.targetX = targetX;
        this.targetY = targetY;
        this.target = target;
        this.speed = 15;
        this.r = 2;
        this.distance = Math.sqrt( (x - targetX)*(x - targetX) + (y - targetY)*(y - targetY));
        this.normalizedX = (x-targetX)/ this.distance;
        this.normalizedY = (y-targetY)/ this.distance;
        this.dx = this.normalizedX * this.speed * -1;
        this.dy = this.normalizedY * this.speed * -1;
        this.margin = 14;
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
    let turret = new Turret(500, 350);
    objects.push(turret);
    draw();
}
//#endregion

start();