//Initialize canvas
let canvas = document.getElementById('canvas');
let ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const red = 'rgb(255, 0, 0)';
const black = 'rgb(0, 0, 0)';
let objects = [];
let targets = [];

//#region Classes

class Turret{
    constructor(x, y){
        this.x = x;
        this.y = y;
        this.r1 = 35;
        this.r2 = 25;
        this.loaded = true;
        this.reloadTime = 600;
        this.rotation = 0;
        this.rotationSpeed = 1;
    }

    draw(){
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

        //Cannon
        ctx.beginPath();
        ctx.fillStyle = black;

        //Calculate angle from turret to target
        if (targets.length > 0){
            
            let t = targets[0];

            let angleDegrees = parseInt(getAngle(this.x, this.y, t.x, t.y));
            if (this.x > t.x){
                angleDegrees += 180;
            }

            if (angleDegrees < 0){
            }

            //Rotate cannon
            if (this.rotation != angleDegrees){

                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.rotate(this.rotation * Math.PI/180);
                ctx.translate(this.x*-1, this.y*-1);
                ctx.fillRect(this.x, this.y, 45, 7.5);
                ctx.closePath();
                ctx.restore();
                angleDegrees < this.rotation ? this.rotation-= this.rotationSpeed : this.rotation += this.rotationSpeed;
                return;
            }

            //Shoot the target
            else if (this.loaded){
                this.loaded = false;
                setTimeout(() => {
                    this.loaded = true;
                }, this.reloadTime);

                let b = new Bullet(this.x, this.y, t.x, t.y, t);
                objects.push(b);
                
            }
        }

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation * Math.PI/180);
        ctx.translate(this.x*-1, this.y*-1);
        ctx.fillRect(this.x, this.y, 45, 7.5);
        ctx.closePath();
        ctx.restore();
    }
}

class Target{
    constructor(x, y){
        this.x = x;
        this.y = y;
        this.r = 25;
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
    }

    draw(){

        this.x += this.dx;
        this.y += this.dy;

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI*2, true);
        ctx.fillStyle = black;
        ctx.fill();
        ctx.closePath();

        //Dx > 0, Dy > 0
        
        if (this.dx > 0 && this.dy > 0){

            for (let i = 0; i < targets.length; i++){
                let t = targets[i];
                if (this.x >= t.x && this.y >= t.y){
                    this.hit(t);
                }
            }
        }

        //Dx < 0, Dy > 0
        else if (this.dx < 0 && this.dy > 0){

            for (let i = 0; i < targets.length; i++){
                let t = targets[i];
                if (this.x <= t.x && this.y >= t.y){
                    this.hit(t);
                }
            }
        }

        //Dx > 0, Dy < 0
        else if (this.dx > 0 && this.dy < 0){

            for (let i = 0; i < targets.length; i++){
                let t = targets[i];
                if (this.x >= t.x && this.y <= t.y){
                    this.hit(t);
                }
            }
        }

        //Dx < 0, Dy < 0
        else{
            for (let i = 0; i < targets.length; i++){
                let t = targets[i];
                if (this.x <= t.x && this.y <= t.y){
                    this.hit(t);
                }
            }
        }
    }

    hit(target){
        objects.splice(objects.indexOf(this), 1);
        target.hp--;
        //Eliminate target
        if (target.hp <= 0){
            objects.splice(objects.indexOf(target), 1);
            targets.splice(targets.indexOf(target), 1);
        }
    }
}

//#endregion

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

canvas.addEventListener('click', e => {
    let t = new Target(e.screenX, e.screenY - 130);
    objects.push(t);
    targets.push(t);
});

//#region Helper Functions

//Get the angle of two points
function getAngle(x1,y1, x2,y2){
    let opposite = (y2-y1);
    let adjacent = (x2-x1);
    let angle = (Math.atan(opposite/adjacent) * 180 / Math.PI).toFixed(0);
    console.log(angle);
    
    return angle;
}

function start(){
    let turret = new Turret(500, 350);
    objects.push(turret);
    draw();
}
//#endregion

start();