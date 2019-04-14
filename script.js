//#region Global variables
let canvas = document.getElementById('canvas');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
let ctx = canvas.getContext('2d');
const red = 'rgb(255, 70, 70)';
const ared = 'rgba(255, 70, 70, 0.6)';
const green = 'rgb(0, 175, 0)';
const agreen = 'rgba(0, 175, 0, 0.6)';
const blue = 'rgb(0, 0, 255)';
const ablue = 'rgba(0, 0, 255, 0.6)';
const black = 'rgb(20, 20, 20)';
const ablack = 'rgba(20, 20, 20, 0.6)';

//Menu
const buttonsX = canvas.width * 0.95;
const buttonsYmargin = canvas.height * 0.1;
const buttonR = 30;

//Turrets
let mouseX = canvas.width / 2;
let mouseY = canvas.height / 2;
let hoveredTurret = undefined;
let selectedTurret = undefined;

//Arrays
let objects = [];
let turrets = [];
let targets = [];
let buttons = [];

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
        this.reloadTime = 700;
        this.rotation = 90;
        this.rotationSpeed = 7;
        this.selected = false;
    }

    draw(){

        if (this.held){
            this.x = mouseX;
            this.y = mouseY;
            this.drawBody();
            this.drawCannon();
            return;
        }
        
        //Draw body
        this.drawBody();

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

        //Draw cannon
        this.drawCannon();
    }

    drawBody(){

        //Selected circle
        if (this.selected){
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.r1 * 1.1, 0, Math.PI*2, true);
            ctx.fillStyle = ablue;
            ctx.fill();
            ctx.closePath();
        }

        //Outer circle
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r1, 0, Math.PI*2, true);
        ctx.fillStyle = green;
        if (this.held){
            ctx.fillStyle = agreen;

            if (this.taken){
                ctx.fillStyle = ablack;
            }
        }
        ctx.fill();
        ctx.closePath();

        //Inner circle
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r2, 0, Math.PI*2, true);
        ctx.fillStyle = red;
        if (this.held){
            ctx.fillStyle = ared;
            if (this.taken){
                ctx.fillStyle = ablack;
            }
        }
        ctx.fill();
        ctx.closePath();
    }

    drawCannon(){
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate((this.rotation - 180) * Math.PI/180);
        ctx.translate(this.x*-1, this.y*-1);
        ctx.fillStyle = black;
        if (this.held){
            ctx.fillStyle = ablack;
            if (this.taken){
                ctx.fillStyle = ablack;
            }
        }
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
        a.volume = 0.35;
        a.play();
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
        this.r = Math.random() * 14 + 6;
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
        this.particles = 4;
        this.particleSpeedModifier = 0.4;
    }

    draw(){

        this.move();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI*2, true);
        ctx.fillStyle = 'rgb(0,0,0)';
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

        //Particles
        for (let i = 0; i < this.particles; i++){
            let modifierX = Math.random() * this.particleSpeedModifier;
            let modifierY = Math.random() * this.particleSpeedModifier;
            let r = Math.random() * 1.5 + 0.25;
            let p = new Particles(this.x, this.y, this.dx * -1 * modifierX, this.dy * -1 * modifierY, r);
            objects.push(p);
        }

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

    move(){
        this.x += this.dx;
        this.y += this.dy;
    }
}

class Particles{
    constructor(x, y, dx, dy, r){
        this.x = x;
        this.y = y;
        this.dx = dx;
        this.dy = dy;
        this.r = r;
        this.selfDestructTimer = setTimeout(() => {
            this.selfDestruct();
        },250);
    }

    draw(){
        this.x += this.dx;
        this.y += this.dy;

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI*2, true);
        ctx.fillStyle = 'rgb(0,0,0)';
        ctx.fill();
        ctx.closePath();
    }

    selfDestruct(){
        objects.splice(objects.indexOf(this), 1);
    }
}

class Button{
    constructor(x, y, execute){
        this.x = x;
        this.y = y;
        this.r = buttonR;
        this.execute = execute;
    }

    draw(){
        ctx.beginPath();
        ctx.fillStyle = 'teal';
        ctx.arc(this.x, this.y, this.r, 0, Math.PI*2, true);
        ctx.fill();
        ctx.closePath();
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

    mouseX = e.clientX;
    mouseY = e.clientY;
    if (hoveredTurret)
    console.log(`held: ${hoveredTurret.held}, taken:${hoveredTurret.taken}`);
    
    

    //If a turret is hovered
    if (hoveredTurret){

        //Drop the purchased turret
        if (hoveredTurret.held && !hoveredTurret.taken){
            hoveredTurret.held = false;
        }

        //Unselect the turret
        else if (hoveredTurret.selected){
            selectTurret(false);
        }

        //Select the turret
        else if (!hoveredTurret.held){                
            selectTurret(true);
        }
    }

    //Shop / Upgrades
    else{

        if (selectedTurret){
            selectedTurret.selected = false;
        }

        for(let i = 0; i < buttons.length; i++){
            let b = buttons[i];
            let d = Math.sqrt((mouseX - b.x)*(mouseX - b.x) + (mouseY - b.y)*(mouseY - b.y));
            if (d <= b.r){
                b.execute();
            }
        }
    }
});

//On mouse move
canvas.addEventListener('mousemove', e => {

    mouseX = e.clientX;
    mouseY = e.clientY;

    if (hoveredTurret && !hoveredTurret.held){
        hoveredTurret = undefined;
    }

    else if(hoveredTurret){
        hoveredTurret.taken = false;
    }

    //Check whether the cursor is placed on a turret(assign 'hoveredTurret')
    for(let i = 0; i < turrets.length; i++){
        
        //The current turret we're checking
        let t = turrets[i];
        //The distance between the cursor and t
        let d = Math.sqrt((mouseX - t.x)*(mouseX - t.x) + (mouseY - t.y)*(mouseY - t.y));

        if (hoveredTurret == undefined){
    
            //Cursor is on a turret
            if (d <= t.r1){
                hoveredTurret = t;
                break;
            }
        }

        //A turret is being placed, make sure not on top of another turret
        else{
            if (t == hoveredTurret){
                continue;
            }

            else{
                //Cannot spawn a turret here, already taken
                if (d <= t.r1 * 2){
                    hoveredTurret.taken = true;
                    break;
                }
            }
        }
        
    }

});

//Get the angle between two points
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

    //Draw objects
    objects.forEach(obj => {
        obj.draw();
    });
}

//Main method
function start(){    
    drawButtons();
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

    }, 1000);
}

//Shop buttons
function drawButtons(){

    function purchaseTurret(){

        let t = new Turret(mouseX, mouseY);
        t.held = true;
        hoveredTurret = t;

        objects.push(t);
        turrets.push(t);
    }

    //Purchase turret
    let b = new Button(buttonsX, buttonsYmargin * 2, purchaseTurret);
    objects.push(b);
    buttons.push(b);
}

//Selects a turret, used for fetching information and upgrading
function selectTurret(state){

    //Select a turret, show upgrades & info
    if (state){

        //A turret is already selected, diselect it
        if (selectedTurret){
            selectedTurret.selected = false;
        }

        //Select the new turret
        selectedTurret = hoveredTurret;
        selectedTurret.selected = true;
    }

    //Unselect the selected turret, hide info and upgrades
    else{
        selectedTurret.selected = false;
    }
}

//#endregion

start();
sendWave();