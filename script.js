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
let money = 2000;
const turretPrice = 100;
const fireRate1Price = 150;
const fireRate2Price = 400;
const fireRate3Price = 750;
const damage1Price = 150;
const damage2Price = 400;
const damage3Price = 750;

//Enemies
const cp1X = 0;
const cp1Y = canvas.height / 2;
let cp1 = [cp1X, cp1Y];

const cp2X = canvas.width / 2;
const cp2Y = canvas.height * 0.25;
let cp2 = [cp2X, cp2Y];

const cp3X = canvas.width;
const cp3Y = cp1Y;
let cp3 = [cp3X, cp3Y];

let checkpoints = [cp1, cp2, cp3];

//Arrays
let objects = [];
let turrets = [];
let enemies = [];
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

        //If there are any enemies
        if (enemies.length > 0){

            //Find a target
            if (!this.locked){

                //#region Choose target
                
                let t;
                let largestX = 0;
                let index = 0;

                //Loop through all enemies and find the nearest target(that requires the least amount of rotation)
                for (let i = 0; i < enemies.length; i++){

                    t = enemies[i];
                    if (t.x > largestX){
                        largestX = t.x;
                        index = i;
                    }
                }

                t = enemies[index];

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
        let a = new Audio('/Sounds/Pew.wav');
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

class Enemy{
    constructor(x, y){
        this.x = x;
        this.y = y;
        this.r = 10;
        this.hp = 0;
        this.speed = 5;
        this.reward = 0;
        this.color = black;
        this.attackers = [];
        this.checkpoint = 1;

        this.targetX = checkpoints[this.checkpoint][0];
        this.targetY = checkpoints[this.checkpoint][1];
        this.distance = Math.sqrt((this.x - this.targetX)*(this.x - this.targetX) + (this.y - this.targetY)*(this.y - this.targetY));
        this.normalizedX = (this.x-this.targetX)/ this.distance;
        this.normalizedY = (this.y-this.targetY)/ this.distance;
        this.dx = this.normalizedX * this.speed * -1;
        this.dy = this.normalizedY * this.speed * -1;
    }

    draw(){
        this.move();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI*2, false);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
    }

    move(){

        let d = Math.sqrt((this.x - this.targetX)*(this.x - this.targetX) + (this.y - this.targetY)*(this.y - this.targetY));
        if (d <= this.speed * 6){
            this.changeCheckpoint();
        }

        this.x += this.dx;
        this.y += this.dy;
    }

    changeCheckpoint(){

        this.checkpoint++;
        if (this.checkpoint == checkpoints.length){
            objects.splice(objects.indexOf(this), 1);
            enemies.splice(objects.indexOf(this), 1);
            return;
        }
        
        this.targetX = checkpoints[this.checkpoint][0];
        this.targetY = checkpoints[this.checkpoint][1];
        this.distance = Math.sqrt((this.x - this.targetX)*(this.x - this.targetX) + (this.y - this.targetY)*(this.y - this.targetY));
        this.normalizedX = (this.x-this.targetX)/ this.distance;
        this.normalizedY = (this.y-this.targetY)/ this.distance;
        this.dx = this.normalizedX * this.speed * -1;
        this.dy = this.normalizedY * this.speed * -1;
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

        if (enemies.length == 0){
            return;
        }

        //Hit detection
        for (let i = 0; i < enemies.length; i++){
            let t = enemies[i];
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
            enemies.splice(enemies.indexOf(target), 1);
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

    //Clear button hovers every frame
    buttons.forEach(b => {
        b.hovered = false;
    });

    //Clear turret hovers every frame
    if (hoveredTurret && !hoveredTurret.held){
        hoveredTurret = undefined;
    }

    //Clear turret being 'taken'
    else if(hoveredTurret){
        hoveredTurret.taken = false;
    }

    //#region Check whether a turret is being hovered
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

    //#endregion

    //#region Check whether a button is being hovered

    //If the mouse is on the left side on the screen, no need to check for button hovers
    if (mouseX < buttonsX){
        return;
    }

    for (let i = 0; i < buttons.length; i++){

        //The current button we're checking
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

    //#endregion

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

    //Draw map
    createMap();

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

    let e = new Enemy(cp1X, cp1Y);

    //#region Set enemy's attributes

    //Generate a random number between 1-100
    let r = Math.round(Math.random() * 99 + 1);

    //Regular enemies - 70% chance
    if (r <= 70){
        addAttributes(e, 'regular');
    }

    //Small enemies - 15% chance
    else if(r > 70 && r <= 85){
        addAttributes(e, 'small');
    }

    //Big enemies - 10% chance
    else if(r > 85 && r <= 95){
        addAttributes(e, 'big');
    }

    else{
        addAttributes(e, 'huge');
    }

    //#endregion

    objects.push(e);
    enemies.push(e);

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
        if (money >= turretPrice){
            money -= turretPrice;
            let t = new Turret(mouseX, mouseY);
            t.held = true;
            t.taken = true;
            hoveredTurret = t;
            objects.push(t);
            turrets.push(t);
        }
    }

    function upgradeFireRate(price){

        if (money >= price){
            money -= price;
            selectedTurret.fireRateLevel++;
            selectedTurret.reloadTime *= 0.75;
        }

        createButtons('upgrades');
    }

    function upgradeDamage(price){

        if (money >= price){
            money -= price;
            selectedTurret.damageUpgradeLevel++;
            selectedTurret.damage++;
        }

        createButtons('upgrades');
    }

    //Erase all buttons
    buttons.forEach(b => {
        objects.splice(objects.indexOf(b), 1);
    });
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
        let level1, level2, price1, price2;

        //Upgrade Fire Rate
        level1 = selectedTurret.fireRateLevel;
        if (level1 <= 3){
            if (level1 == 1){
                price1 = fireRate1Price;
            }

            else if (level1 == 2){
                price1 = fireRate2Price;
            }

            else{
                price1 = fireRate3Price;
            }
            
            let b1 = new Button(buttonsX, buttonsYmargin * (buttons.length + 2), `./images/buttons/btn_firerate${level1}.png`, () => {upgradeFireRate(price1)}, price1);
            
            addButton(b1);
        }
        
        //Upgrade damage
        level2 = selectedTurret.damageUpgradeLevel;
        if (level2 <= 3){
            if (level2 == 1){
                price2 = damage1Price;
            }

            else if (level2 == 2){
                price2 = damage2Price;
            }

            else{
                price2 = damage3Price;
            }
            let b2 = new Button(buttonsX, buttonsYmargin * (buttons.length + 2), `./images/buttons/btn_damage${level2}.png`, () => {upgradeDamage(price2)}, price2);
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

//Change an enemy's attributes
function addAttributes(e, type){
    switch (type){

        //Regular enemies
        case 'regular':
        e.hp = 2;
        e.speed = 1;
        e.reward = 10;
        e.color = 'black';
        e.r = 20;
        break;

        //Small enemies
        case 'small':
        e.hp = 1;
        e.speed = 2.5;
        e.reward = 5;
        e.color = 'red';
        e.r = 10;
        break;

        //Big enemies
        case 'big':
        e.hp = 5;
        e.speed = 0.5;
        e.reward = 20;
        e.color = 'green';
        e.r = 35;
        break;

        //Huge enemies
        case 'huge':
        e.hp = 10;
        e.speed = 1;
        e.reward = 10;
        e.color = 'blue';
        e.r = 55;
        break;
    }
}

//Create map
function createMap(){

    for (let i = 0; i < checkpoints.length - 1; i++){
        
        ctx.beginPath();
        ctx.moveTo(checkpoints[i][0], checkpoints[i][1]);
        ctx.lineTo(checkpoints[i+1][0], checkpoints[i+1][1]);
        ctx.stroke();
        ctx.closePath();
    }
}

//#endregion

start();
sendWave();