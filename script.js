//#region Global variables
let canvas = document.getElementById('canvas');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
let ctx = canvas.getContext('2d');
const red = 'rgb(255, 70, 70)';
const green = 'rgb(0, 175, 0)';
const blue = 'rgb(0, 0, 255)';
const black = 'rgb(20, 20, 20)';

//Menu
const menuX = canvas.width * 82 / 100;
const menuY = canvas.height * 13 / 100;
const menuW = canvas.width * 16 / 100;
const menuH = canvas.height * 74 / 100;

//Cursors
let currentCursor;
let crosshair;
let mouseX = canvas.width / 2;
let mouseY = canvas.height / 2;
const cSize = 20;

//Arrays
let objects = [];
let turrets = [];
let targets = [];

//#endregion

//#region Classes

class Turret{
    constructor(x, y){
        this.x = x;
        this.y = y;
        this.r1 = 23;
        this.r2 = 17;
        this.cannonLength = 30;
        this.cannonWidth = 4;
        this.locked = false;
        this.loaded = true;
        this.reloadTime = 300;
        this.rotation = 90;
        this.rotationSpeed = 20;
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
                    this.target.attackers.push(this);
                    this.fixRotation();
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
        let p = new Projectile(this.x, this.y, this.target);
        p.turret = this;

        //Sounds
        let a = new Audio('/Sounds/M1.wav');
        //a.play();
        objects.push(p);
    }

    fixRotation(){
        //Check for negative angle
        if (this.rotation < 0){
            this.rotation += 360;
        }

        //Check for angle over 360
        else if (this.rotation > 360){
            this.rotation -= 360;
        }
    }
}

class Target{
    constructor(x, y){
        this.x = x;
        this.y = y;
        this.r = 10;
        this.hp = 1;
        this.speed = 1;
        this.attackers = [];
    }

    draw(){
        this.move();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI*2, false);
        ctx.fillStyle = red;
        ctx.fill();
        ctx.closePath();
    }

    move(){
        this.x += this.speed;
    }
}

class Projectile{
    constructor(x,y, target){
        this.x = x;
        this.y = y;
        this.target = target;
        this.targetX = target.x;
        this.targetY = target.y;
        this.speed = 25;
        this.r = 2;
        this.distance = Math.sqrt((x - this.targetX)*(x - this.targetX) + (y - this.targetY)*(y - this.targetY));
        this.normalizedX = (x-this.targetX)/ this.distance;
        this.normalizedY = (y-this.targetY)/ this.distance;
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
            this.target.attackers.forEach(attacker => {
                attacker.locked = false;
            });
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

//Rounded rectangle
CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    this.beginPath();
    this.moveTo(x+r, y);
    this.arcTo(x+w, y,   x+w, y+h, r);
    this.arcTo(x+w, y+h, x,   y+h, r);
    this.arcTo(x,   y+h, x,   y,   r);
    this.arcTo(x,   y,   x+w, y,   r);
    this.closePath();
    return this;
}

//On mouse left-click
canvas.addEventListener('click', e => {

    //If crosshair is not active, do nothing
    if (currentCursor != 'crosshair'){
        return;
    }

    //Shoot
    let t = new Target(e.clientX, e.clientY);
    objects.push(t);
    targets.push(t);
});

//On mouse move
canvas.addEventListener('mousemove', e => {

    mouseX = e.clientX;
    mouseY = e.clientY;

    //Cursor is inside the menu
    let insideMenuX = e.clientX >= menuX && e.clientX <= menuX + menuW;
    let insideMenuY = e.clientY >= menuY && e.clientY <= menuY + menuH;
    if (insideMenuX && insideMenuY){
        setCursor('pointer');
    }

    //Cursor is inside the field
    else{
        //Cursor is on a turret(Move)
        for(let i = 0; i < turrets.length; i++){
            let t = turrets[i];
            let d = Math.sqrt((mouseX - t.x)*(mouseX - t.x) + (mouseY - t.y)*(mouseY - t.y));

            //Collision
            if (d <= t.r1){
                setCursor('move');
                return;
            }
        }

        //Cursor is in the field(Crosshair)
        if (currentCursor != 'crosshair'){
            setCursor('crosshair');
        }
    }
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
    
    //Draw background
    ctx.fillStyle = 'rgb(95, 255, 95)';
    ctx.fillRect(0,0, canvas.width, canvas.height);

    //Draw Menu
    ctx.fillStyle = 'rgba(0, 128, 128, 0.6)';
    ctx.roundRect(menuX, menuY, menuW, menuH, 15).fill();
    //ctx.beginPath();

    //Draw objects
    objects.forEach(obj => {
        obj.draw();
    });
}

//Main method
function start(){    
    let turret = new Turret(650, 350);
    objects.push(turret);
    turrets.push(turret);
    draw();
}

//Spawns enemies
function sendWave(){

    setInterval(() => {

    let x = 10;
    let y = Math.random() * (canvas.height - canvas.height*0.2) + canvas.height*0.1;
    let t = new Target(x, y);
    objects.push(t);
    targets.push(t);

    }, 700);
}

//Change the cursor
function setCursor(type){

    //Turn crosshair off
    if(currentCursor == 'crosshair'){
        objects.splice(objects.indexOf(crosshair), 1);
    }
    
    switch(type){

        //Crosshair
        case 'crosshair':
        crosshair = new Image();
        crosshair.src = '/Images/crosshair.png';
        crosshair.draw = () => {
            ctx.drawImage(crosshair, mouseX - cSize / 2, mouseY - cSize / 2, cSize, cSize);
        };
        objects.push(crosshair);
        canvas.style.cursor = 'none';
        currentCursor = 'crosshair';
        break;

        //Pointer
        case 'pointer':
        canvas.style.cursor = 'pointer';
        currentCursor = 'pointer';

        break;
        
        //Move
        case 'move':
        canvas.style.cursor = 'move';
        currentCursor = 'move';
        break;
    }
}

//#endregion

start();
sendWave();