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
const menuX = canvas.width * 82 / 100;
const menuY = canvas.height * 13 / 100;
const menuW = canvas.width * 16 / 100;
const menuH = canvas.height * 74 / 100;
const buttonSize = 50;

//Cursors
let currentCursor;
let crosshair;
let mouseX = canvas.width / 2;
let mouseY = canvas.height / 2;
let hoveredTurret = undefined;
const cSize = 20;

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
        this.reloadTime = 1000;
        this.rotation = 90;
        this.rotationSpeed = 1;
        this.selected = false;
    }

    draw(){
        if (this.selected){
            this.x = mouseX;
            this.y = mouseY;
        }
        
        //Draw body
        this.drawBody();

        //Draw cannon
        ctx.beginPath();
        ctx.fillStyle = black;

        //If there are any targets
        if (targets.length > 0){

            //If the target is being moved, return
            if (this.selected){
                this.drawCannon();
                return;
            }

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
        if (this.selected){
            ctx.fillStyle = agreen;
        }
        ctx.fill();
        ctx.closePath();

        //Inner circle
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r2, 0, Math.PI*2, true);
        ctx.fillStyle = red;
        if (this.selected){
            ctx.fillStyle = ared;
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
        if (this.selected){
            ctx.fillStyle = ablack;
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

class Button{
    constructor(x, y, execute){
        this.x = x;
        this.y = y;
        this.size = buttonSize;
        this.execute = execute;
    }

    draw(){
        ctx.beginPath();
        ctx.fillStyle = 'teal';
        ctx.rect(this.x, this.y, 35, 35);
        ctx.fill();
        //ctx.roundRect(this.x, this.y, buttonSize, buttonSize, 15).fill();
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

    //#region Shop & Moving turrets
    if (currentCursor != 'crosshair'){

        //If a turret is hovered
        if (hoveredTurret){
            

            //Click to release the turret
            if (hoveredTurret.selected){
                hoveredTurret.selected = false;
            }

            //Click to move the turret
            else{
                hoveredTurret.selected = true;
            }
        }

        //Shop / Upgrades
        else{
            
            for(let i = 0; i < buttons.length; i++){
                let b = buttons[i];
                if ((e.clientX >= b.x && e.clientX <= b.x + b.size) && (e.clientY >= b.y && e.clientY <= b.y + b.size)){
                    
                    b.execute();
                }
            }
        }

        return;
    }

    //#endregion

    //#region User shooting
    let a = new Audio('/Sounds/M1.wav');
    a.play();
    for(let i = 0; i < targets.length; i++){
        let t = targets[i];
        let d = Math.sqrt((mouseX - t.x)*(mouseX - t.x) + (mouseY - t.y)*(mouseY - t.y));

        //Collision
        if (d <= t.r){
            
            //Damage target
            t.hp--;

            //Eliminate target
            if (t.hp <= 0){
                objects.splice(objects.indexOf(t), 1);
                targets.splice(targets.indexOf(t), 1);
                t.attackers.forEach(attacker => {
                    attacker.locked = false;
                });
            }

            return;
        }
    }

    //#endregion

});

//On mouse move
canvas.addEventListener('mousemove', e => {

    hoveredTurret = undefined;
    mouseX = e.clientX;
    mouseY = e.clientY;

    //Cursor is inside the menu
    let insideMenuX = e.clientX >= menuX && e.clientX <= menuX + menuW;
    let insideMenuY = e.clientY >= menuY && e.clientY <= menuY + menuH;
    if (insideMenuX && insideMenuY){
        setCursor('pointer');
        return;
    }

    //Cursor is on a turret(pointer)
    for(let i = 0; i < turrets.length; i++){
        let t = turrets[i];
        let d = Math.sqrt((mouseX - t.x)*(mouseX - t.x) + (mouseY - t.y)*(mouseY - t.y));

        //Collision
        if (d <= t.r1){
            setCursor('pointer');
            hoveredTurret = t;
            return;
        }
    }

    //Cursor is in the field(Crosshair)
    if (currentCursor != 'crosshair'){
        setCursor('crosshair');
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

    drawMenu();

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
    }
}

//Menu (Info, Upgrades and shop)
function drawMenu(){

    //Menu outline
    ctx.fillStyle = 'rgba(0, 128, 128, 0.6)';
    ctx.beginPath();
    ctx.roundRect(menuX, menuY, menuW, menuH, 15).fill();
    ctx.closePath();

    //Borders
    let borderMargin = menuH / 3;

    for (let i = 1; i <= 2; i++){
        ctx.beginPath();
        ctx.moveTo(menuX, menuY + borderMargin * i);
        ctx.lineTo(menuX + menuW, menuY + borderMargin * i);
        ctx.stroke();
        ctx.closePath();
    }
}

function drawButtons(){

    function purchaseTurret(){
        let x,y;

        //Make sure no two turrets spawn on top of each other
        outer:
        while(true){
            x = Math.random() * (canvas.width - menuW);
            y = Math.random() * canvas.height;

            for (let i = 0; i < turrets.length; i++){
                let t = turrets[i];
                let d = Math.sqrt((x - t.x)*(x - t.x) + (y - t.y)*(y - t.y));
                if (d <= t.r1 * 3){
                    continue outer;
                }

                if (i == turrets.length - 1){
                    break outer;
                }
            }
        }
        let t = new Turret(x, y);
        objects.push(t);
        turrets.push(t);
    }

    //Borders
    let borderMargin = menuH / 3;
    let area1Y = (menuY * 2 + borderMargin) / 2;
    let area2Y = (menuY + menuH) / 2;
    let area3Y = area2Y + borderMargin;

    //Purchase turret
    let b = new Button((menuX * 2 + menuW) / 2, area1Y, purchaseTurret);
    objects.push(b);
    buttons.push(b);
}

//#endregion

start();
sendWave();