//#region Global variables
let canvas = document.getElementById('canvas');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
let ctx = canvas.getContext('2d');
ctx.font = '22px Arial';

//Colors
const red = 'rgb(255, 70, 70)';
const ared = 'rgba(255, 70, 70, 0.6)';
const green = 'rgb(0, 175, 0)';
const agreen = 'rgba(0, 175, 0, 0.6)';
const blue = 'rgb(0, 0, 255)';
const ablue = 'rgba(0, 0, 255, 0.6)';
const black = 'rgb(20, 20, 20)';
const ablack = 'rgba(20, 20, 20, 0.6)';

//Buttons
const buttonsX = canvas.width * 0.93;
const buttonsYmargin = canvas.height * 0.15;
const buttonSize = 60;
let currentButtons = 'shop';

//Turrets
let mouseX = canvas.width / 2;
let mouseY = canvas.height / 2;
let hoveredTurret = undefined;
let selectedTurret = undefined;

//Player stats
const statsY = canvas.height * 0.075;
const moneyX = canvas.width * 0.4;

//Shop
let money = 100;
const turretPrice = 100;
const fireRate1Price = 150;
const fireRate2Price = 500;
const damage1Price = 150;
const damage2Price = 500;

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
        this.damage = 1;
        this.cannonLength = 30;
        this.cannonWidth = 4;
        this.locked = false;
        this.loaded = true;
        this.reloadTime = 700;
        this.rotation = 90;
        this.rotationSpeed = 7;
        this.selected = false;
        this.damageUpgradeLevel = 1;
        this.fireRateLevel = 1;
        this.damageUpgradeCost = 100;
        this.fireRateUpgradeCost = 100;
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
        let p = new Projectile(this.x, this.y, this.target, this.damage);
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
    constructor(x, y, reward){
        this.x = x;
        this.y = y;
        this.r = Math.random() * 14 + 6;
        this.hp = 1;
        this.speed = 1;
        this.reward = reward;
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
    constructor(x,y, target, damage){
        this.x = x;
        this.y = y;
        this.target = target;
        this.targetX = target.x;
        this.targetY = target.y;
        this.speed = 25;
        this.damage = damage;
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
        target.hp -= this.damage;

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

            money += target.reward;
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
    constructor(x, y, src, execute, price){
        this.x = x;
        this.y = y;
        this.size = buttonSize;
        this.execute = execute;
        this.src = src;
        this.price = price;
    }

    draw(){
        let img = new Image();
        img.src = this.src;

        if (this.hovered){
            let src = [...this.src];
            (src.splice(-4, 4));
            src = src.join('');
            src += '_hover.png';
            img.src = src;
        }

        //Draw button
        ctx.drawImage(img, this.x, this.y, this.size, this.size);

        //Draw price text
        ctx.fillStyle = 'black';
        ctx.font = '12px Arial';
        ctx.fillText(this.price, this.x + 0.3* this.size, this.y + 0.3* this.size);
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

        //Check mouse position and see if a button was pressed
        for(let i = 0; i < buttons.length; i++){
            let b = buttons[i];

            //A button was pressed, execute the button's method
            if ((mouseX >= b.x && mouseX <= b.x + b.size) && (mouseY >= b.y && mouseY <= b.y + b.size)){
                b.execute();
                return;
            }
        }

        if (selectedTurret){
            selectTurret(false);
        }
    }
});

//On mouse move
canvas.addEventListener('mousemove', e => {

    mouseX = e.clientX;
    mouseY = e.clientY;

    //Clear button hovers
    buttons.forEach(b => {
        b.hovered = false;
    });

    if (hoveredTurret && !hoveredTurret.held){
        hoveredTurret = undefined;
    }

    else if(hoveredTurret){
        hoveredTurret.taken = false;
    }

    //Check whether the cursor is placed on a turret(assign 'hoveredTurret') or a button
    for(let i = 0; i < turrets.length; i++){
        
        //The current turret we're checking
        let t = turrets[i];
        //The distance between the cursor and t
        let d = Math.sqrt((mouseX - t.x)*(mouseX - t.x) + (mouseY - t.y)*(mouseY - t.y));

        //Assign the turret that the cursor is placed on as the hovered turret, and break the loop
        if (hoveredTurret == undefined){
    
            //Cursor is on a turret
            if (d <= t.r1){
                hoveredTurret = t;
                break;
            }
        }

        //A turret is being placed, make sure not on top of another turret
        else{
            //Don't account with collision with itself
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

    for (let i = 0; i < buttons.length; i++){

        //The current turret we're checking
        let b = buttons[i];

        //Is the cursor resting on a button?
        if ((mouseX >= b.x && mouseX <= b.x + b.size) && (mouseY >= b.y && mouseY <= b.y + b.size)){

            //A turret is being placed, make sure not on top of a button
            if (hoveredTurret){
                hoveredTurret.taken = true;
                return;
            }

            //Check if hovering a button
            else{
                b.hovered = true;
                return;
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
    ctx.fillStyle = 'teal';
    ctx.fillRect(0,0, canvas.width, canvas.height);

    //Draw objects
    objects.forEach(obj => {
        obj.draw();
    });

    drawText();
}

//Main method
function start(){
    createButtons('shop');
    draw();
}

//Spawns enemies
function sendWave(){

    setInterval(() => {

    let x = 10;
    let y = Math.random() * (canvas.height - canvas.height*0.2) + canvas.height*0.1;
    let reward = 10;
    let t = new Target(x, y, reward);
    objects.push(t);
    targets.push(t);

    }, 1000);
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
        createButtons('upgrades');
    }

    //Unselect the selected turret, hide info and upgrades
    else{
        selectedTurret.selected = false;
        createButtons('shop');
    }
}

//Toggles between shop and upgrades
function createButtons(state){

    function addButton(b){
        objects.push(b);
        buttons.push(b);
    }

    function purchaseTurret(){
        let t = new Turret(mouseX, mouseY);
        t.held = true;
        t.taken = true;
        hoveredTurret = t;
        objects.push(t);
        turrets.push(t);
    }

    function upgradeFireRate(){
        if (selectedTurret.fireRateUpgradeCost <= money && selectedTurret.fireRateLevel <= 2){
            money -= selectedTurret.fireRateUpgradeCost;
            selectedTurret.fireRateLevel++;
            selectedTurret.fireRateUpgradeCost *= 2;
            selectedTurret.reloadTime *= 0.75;
            createButtons('upgrades');
            
        }
    }

    function upgradeDamage(){
        if (selectedTurret.damageUpgradeCost <= money && selectedTurret.damageUpgradeLevel <= 2){
            money -= selectedTurret.damageUpgradeCost;
            selectedTurret.damageUpgradeLevel++;
            selectedTurret.damageUpgradeCost *= 2;
            selectedTurret.damage++;
            createButtons('upgrades');
        }
    }

    //Erase all buttons
    for (let i = 0; i < buttons.length; i++){
        let b = buttons[i];
        objects.splice(objects.indexOf(b), 1);
    }
    buttons = [];

    //Draw the needed buttons (Shop/Upgrades)
    switch(state){

        //#region Shop
        case 'shop':
        currentButtons = 'shop';

        //Purchase turret button
        let b = new Button(buttonsX, buttonsYmargin * (buttons.length + 2), './images/buttons/btn_turret.png', purchaseTurret, turretPrice);
        addButton(b);
        break;

        //#endregion

        //#region Upgrades
        case 'upgrades':
        currentButtons = 'upgrades';
        let level, price;

        //Upgrade Fire Rate
        level = selectedTurret.fireRateLevel;
        if (level <= 2){
            if (level == 1){
                price = fireRate1Price;
            }

            else{
                price = fireRate2Price
            }
            let b1 = new Button(buttonsX, buttonsYmargin * (buttons.length + 2), `./images/buttons/btn_firerate${level}.png`, upgradeFireRate, price);
            addButton(b1);
        }
        

        //Upgrade damage
        level = selectedTurret.damageUpgradeLevel;
        if (level <= 2){
            if (level == 1){
                price = damage1Price;
            }

            else{
                price = damage2Price
            }
            let b2 = new Button(buttonsX, buttonsYmargin * (buttons.length + 2), `./images/buttons/btn_damage${level}.png`, upgradeDamage, price);
            addButton(b2);
        }

        break;

        //#endregion

    }
}

//Money, enemies alive
function drawText(){ // TOdo

    //Money
    ctx.fillStyle = 'black';
    ctx.font = '22px Arial';
    ctx.fillText(`${money}$`, moneyX, statsY);
}

//#endregion

start();
sendWave();