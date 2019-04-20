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

//Shop
const turretPrice = 100;
const upgrade1Price = 150;
const upgrade2Price = 400;
const upgrade3Price = 750;

//Player info
let lives = 20;
let money = 2000;
const statsY = canvas.height * 0.075;
const livesX = canvas.width * 0.05;
const moneyX = canvas.width * 0.25;

//Checkpoints
let checkpoints = [];

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
        this.range = 100;
        this.cannonLength = 30;
        this.cannonWidth = 4;
        this.locked = false;
        this.loaded = true;
        this.reloadTime = 650;
        this.rotation = 0;
        this.rotationSpeed = 15;
        this.selected = false;
        this.rangeLevel = 1;
        this.damageLevel = 1;
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

            this.fixRotation();

            //#region Choose target
            
            let t, d;
            let largestX = 0;
            let index = -1;

            //Loop through all enemies and find the nearest target(that requires the least amount of rotation)
            for (let i = 0; i < enemies.length; i++){

                t = enemies[i];
                d = Math.sqrt((this.x - t.x)*(this.x - t.x) + (this.y - t.y)*(this.y - t.y));
                
                if (d <= this.range && t.x > largestX){
                    largestX = t.x;
                    index = i;
                }
            }

            if (index == -1){
                this.drawCannon();
                return;
            }

            t = enemies[index];

            //#endregion

            //The angle from the turret to the target
            let angle = getAngle(this.x, this.y, t.x, t.y);
            let diff = Math.abs(this.rotation - angle);

            //#region Rotate cannon

            //Fire
            if (diff <= this.rotationSpeed){

                let d = Math.sqrt((this.x - t.x)*(this.x - t.x) + (this.y - t.y)*(this.y - t.y));
                if (this.loaded && d <= this.range){
                    this.fire(t);
                }
            }

            //If the rotation is more than half a circle
            else if (diff > 180){

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

            //Rotate less than 180 degs
            else{
                angle < this.rotation ? this.rotation -= this.rotationSpeed : this.rotation += this.rotationSpeed;
            }
            
            //#endregion

        }
        //Draw cannon
        this.drawCannon();
    }

    drawBody(){

        //Selected circle
        if (this.selected || this.held){
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.range, 0, Math.PI*2, true);
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
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

    fire(t){
        this.loaded = false;
        setTimeout(() => {
            this.loaded = true;
        }, this.reloadTime);

        //Spawn projectile
        let p = new Projectile(this.x, this.y, t, this.damage);
        p.turret = this;
        objects.push(p);

        //Sounds
        let a = new Audio('/Sounds/M1.wav');
        a.volume = 0.35;
        a.play();
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
        this.speed = 0;
        this.reward = 0;
        this.color = black;
        this.checkpoint = 1;
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
        
        if (d <= Math.max(this.dx, this.dy)){
            this.changeCheckpoint();
        }

        this.x += this.dx;
        this.y += this.dy;
    }

    changeCheckpoint(){

        //Increment checkpoint
        this.checkpoint++;

        //If reached the end, dissapear
        if (this.checkpoint == checkpoints.length){
            this.die();
            lives--;

            //Game over
            if (lives < 0){
                window.location.reload();
            }
            return;
        }
        
        //Set a new route
        this.targetX = checkpoints[this.checkpoint][0];
        this.targetY = checkpoints[this.checkpoint][1];
        this.distance = Math.sqrt((this.x - this.targetX)*(this.x - this.targetX) + (this.y - this.targetY)*(this.y - this.targetY));
        this.normalizedX = (this.x-this.targetX)/ this.distance;
        this.normalizedY = (this.y-this.targetY)/ this.distance;
        this.dx = this.normalizedX * this.speed * -1;
        this.dy = this.normalizedY * this.speed * -1;
    }   

    updateAttributes(){
        this.targetX = checkpoints[this.checkpoint][0];
        this.targetY = checkpoints[this.checkpoint][1];
        this.distance = Math.sqrt((this.x - this.targetX)*(this.x - this.targetX) + (this.y - this.targetY)*(this.y - this.targetY));
        this.normalizedX = (this.x-this.targetX)/ this.distance;
        this.normalizedY = (this.y-this.targetY)/ this.distance;
        this.dx = this.normalizedX * this.speed * -1;
        this.dy = this.normalizedY * this.speed * -1;
    }

    die(){
        objects.splice(objects.indexOf(this), 1);
        enemies.splice(enemies.indexOf(this), 1);
    }
}

class Projectile{
    constructor(x,y, target, damage){
        this.x = x;
        this.y = y;
        this.target = target;
        this.targetX = target.x;
        this.targetY = target.y;
        this.speed = 30;
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
        this.particles = 6;
        this.particleSpeedModifier = 4;
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

        let particlesHolder = this.particles;

        //Eliminate target
        if (target.hp <= 0){
            target.die();
            money += target.reward;
            this.particles *= 7;
        }

        //Particles
        for (let i = 0; i < this.particles; i++){
            let negative1 = Math.round(Math.random()) == 0 ? 1 : -1;
            let negative2 = Math.round(Math.random()) == 0 ? 1 : -1;
            let modifierX = Math.random() * this.particleSpeedModifier * negative1;
            let modifierY = Math.random() * this.particleSpeedModifier * negative2;
            let r = 1.175;
            let p = new Particles(target.x, target.y, modifierX, modifierY, r, target.color);
            objects.push(p);
        }

        if (target.hp <= 0){
            this.particles = particlesHolder;
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
    constructor(x, y, dx, dy, r, color){
        this.x = x;
        this.y = y;
        this.dx = dx;
        this.dy = dy;
        this.r = r;
        this.color = color;
        this.selfDestructTimer = setTimeout(() => {
            this.selfDestruct();
        },250);
    }

    draw(){
        
        this.x += this.dx;
        this.y += this.dy;

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI*2, true);
        ctx.fillStyle = this.color;
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

    //#region Check whether the map is being hovered

    if (hoveredTurret && hoveredTurret.held){
        for (let i = 0; i < checkpoints; i++){
            
        }
    }

    //#endregion

});

document.addEventListener('keypress', e => {

    // E
    if (e.keyCode == 101){
        let e = new Enemy(checkpoints[0][0], checkpoints[0][1]);
        addAttributes(e, 'regular');
        objects.push(e);
        enemies.push(e);
    }

    // A
    else if (e.keyCode == 97){
        console.log(turrets[0].rotation);
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

    //Draw map
    drawCheckpoints();

    //Draw objects
    objects.forEach(obj => {
        obj.draw();
    });

    drawText();
}

//Main method
function start(){
    populateCheckpointsArray();
    createButtons('shop');
    draw();
}

//Spawns enemies
function sendWave(){

    setInterval(() => {

    let e = new Enemy(checkpoints[0][0], checkpoints[0][1]);

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
            selectedTurret.damageLevel++;
            selectedTurret.damage++;
        }

        createButtons('upgrades');
    }

    function upgradeRange(price){

        if (money >= price){
            money -= price;
            selectedTurret.rangeLevel++;
            selectedTurret.range *= 1.2;
        }

        createButtons('upgrades');
    }

    function fetchPrice(level){
        if (level == 1){
            return upgrade1Price;
        }

        else if (level == 2){
            return upgrade2Price;
        }

        else{
            return upgrade3Price;
        }
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
        let level1, level2, price1, price2, level3, price3;

        //Upgrade Fire Rate
        level1 = selectedTurret.fireRateLevel;
        if (level1 <= 3){
            
            //Get the price accoarding to the turret's level
            price1 = fetchPrice(level1);
            
            let b1 = new Button(buttonsX, buttonsYmargin * (buttons.length + 2), `./images/buttons/btn_firerate${level1}.png`, () => {upgradeFireRate(price1)}, price1);
            
            addButton(b1);
        }
        
        //Upgrade damage
        level2 = selectedTurret.damageLevel;
        if (level2 <= 3){

            //Get the price accoarding to the turret's level
            price2 = fetchPrice(level2);

            let b2 = new Button(buttonsX, buttonsYmargin * (buttons.length + 2), `./images/buttons/btn_damage${level2}.png`, () => {upgradeDamage(price2)}, price2);
            addButton(b2);
        }

        //Upgrade range
        level3 = selectedTurret.rangeLevel;
        if (level3 <= 3){
            
            //Get the price accoarding to the turret's level
            price3 = fetchPrice(level3);
            
            let b3 = new Button(buttonsX, buttonsYmargin * (buttons.length + 2), `./images/buttons/btn_range${level3}.png`, () => {upgradeRange(price3)}, price3);
            addButton(b3);
        }

        break;

        //#endregion

    }
}

//Text manager
function drawText(){

    //Current money
    ctx.fillStyle = 'black';
    ctx.font = '22px Arial';
    ctx.fillText(`${money}$`, moneyX, statsY);

    //Current lives
    ctx.fillStyle = 'black';
    ctx.font = '22px Arial';
    ctx.fillText('Lives: ' + lives, livesX, statsY);
}

//Change an enemy's attributes
function addAttributes(e, type){
    switch (type){

        //Regular enemies
        case 'regular':
        
        e.hp = 2;
        e.speed = 3;
        e.reward = 10;
        e.color = 'black';
        e.r = 15;
        break;

        //Small enemies
        case 'small':
        e.hp = 1;
        e.speed = 2.5;
        e.reward = 5;
        e.color = 'red';
        e.r = 7;
        break;

        //Big enemies
        case 'big':
        e.hp = 5;
        e.speed = 0.5;
        e.reward = 20;
        e.color = 'green';
        e.r = 20;
        break;

        //Huge enemies
        case 'huge':
        e.hp = 10;
        e.speed = 1;
        e.reward = 10;
        e.color = 'blue';
        e.r = 30;
        break;
    }

    e.updateAttributes();
}

//Create the enemies route dynamically
function populateCheckpointsArray(){

    //The number of checkpoints to generate
    const numberOfCheckpoints = 7;

    //The X margin between two different checkpoints
    const margin = canvas.width / (numberOfCheckpoints + 1);

    let x, y;
    let lastX, lastY;
    
    for (let i = 0; i < numberOfCheckpoints; i++){

        //First checkpoint is fixed - (0, H/2)
        if (i == 0){
            x = 0;
            y = canvas.height / 2;
            checkpoints.push([x, y]);
            continue;
        }

        else if (i == 1 || i == checkpoints.length - 2){
            let angle;
            lastX = checkpoints[i - 1][0];
            lastY = checkpoints[i - 1][1];

            while (true){
            
                //The x value is calculated simply by adding the margin to the last checkpoint's x value
                x = lastX + margin;
    
                //The y value is randomly generated
                y = Math.random() * (canvas.height*0.85 - canvas.height*0.15) + canvas.height*0.15;

                angle = getAngle(lastX, lastY, x, y);
                if (angle % 180 == 0)
                    break;
            }
        }

        //Last checkpoint is fixed - (W, H/2)
        else if (i == numberOfCheckpoints - 1){
            x = canvas.width;
            y = canvas.height / 2;
        }

        //Rest of the checkpoints are randomly placed
        else{

            let angle;
            lastX = checkpoints[i - 1][0];
            lastY = checkpoints[i - 1][1];

            while (true){

                //The x value is calculated simply by adding the margin to the last checkpoint's x value
                x = lastX + margin;
    
                //The y value is randomly generated
                y = Math.random() * (canvas.height*0.85 - canvas.height*0.15) + canvas.height*0.15;

                angle = getAngle(lastX, lastY, x, y);
                if (angle % 45 == 0)
                    break;
            }
        }

        //Add the checkpoint to the checkpoints array
        checkpoints.push([x, y]);
    }
}

//After populating the checkpoints array, draw them(every frame)
function drawCheckpoints(){
    
    let x, y;
    let nextX, nextY;
    let rectHeight = 0.05 * canvas.width;

    for (let i = 0; i < checkpoints.length; i++){

        //Current X & Y
        x = checkpoints[i][0];
        y = checkpoints[i][1];

        //Next X & Y
        if (i != checkpoints.length - 1){
            nextX = checkpoints[i + 1][0];
            nextY = checkpoints[i + 1][1];

            let angle = getAngle(x,y, nextX, nextY);
            let d = Math.sqrt((x - nextX)*(x - nextX) + (y - nextY)*(y - nextY));
            ctx.beginPath();
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate((angle - 180) * Math.PI/180);
            ctx.translate(x*-1, y*-1);
            ctx.fillStyle = 'darkorange';
            ctx.fillRect(x - rectHeight/2, y - rectHeight/2, d * 1.1, rectHeight);
            ctx.closePath();
            ctx.restore();
        }
    }
}

//#endregion

start();
sendWave();