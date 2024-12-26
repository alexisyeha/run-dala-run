/**
 * Run Dala Run!
 * A simple pixel art game with 'space bar' interaction. Player uses 'space bar' to make horse jump and collect plant balls and socks, while avoiding meatballs. Speed gets faster when the score gets higher. Happy holliday and happy new year!
 *
 * @summary Run, Dala Run! - Christmas Game inspired by Swedish dalahorse. 
 * @author Alex Chung
 */


//constants for values that don't change
const canvasWidth = 700;
const canvasHeight = 400;
const runningSpeed = 6;
const gravity = 0.45 ;
const obstacleDistanceRange = [120, 1000]; // New obstacles will be generated at random distances in this range
const relativeFloorY = 0.9; // Floor y position relative to canvas height
const winScore = 240;

//start score from zero
let score = 0;  
let currentScreen = 0 // 0: start screen, 1: game, 2: game over, 3: win

// How many game frames to wait between horse animation frames
const horseAnimationFrameGap = 8;
// Counts how many frames have elapsed since we last updated the horse animation
let animationFrameCounter = 0; 

// These variable hold all the loaded assets
let horseAssets = [];
let obstacleAssets = [];
let backgroundAssets = [];
let backgroundImage;
let pixelFont;
let startImage;
let endImage;
let startMusic;
let gameMusic;
let jumpSound;

let horseSprite;
let obstacleSprites = [];
let backgroundSpriteLayers = [];
let snowflakes = [];

// These describe how background sprites are generated for each background layer
const backgroundLayerConfigs = [
  // Mountains
  {
    horizontalSpacing: [120, 250],
    verticalVariance: 5,
    speed: 0.5,
    y: 0.4
  },
  // Trees
  {
    horizontalSpacing: [40, 100],
    verticalVariance: 10,
    speed: 1.0,
    y: 0.45
  },
  // Flowers
  {
    horizontalSpacing: [60, 200],
    verticalVariance: 12,
    speed: 1.5,
    y: 0.64
  },
  // Floor
  {
    horizontalSpacing: [33, 33],
    verticalVariance: 0,
    speed: runningSpeed,
    y: relativeFloorY
  }
];

// Loads all assets
function preload() {
  backgroundAssets = [
    [
      loadImage('./assets/bg/layer1/mount1.png'),
      loadImage('./assets/bg/layer1/mount2.png'),
      loadImage('./assets/bg/layer1/mount3.png'),
      loadImage('./assets/bg/layer1/mount4.png')
    ],
    [
      loadImage('./assets/bg/layer2/tree1.png'),
      loadImage('./assets/bg/layer2/tree2.png'),
      loadImage('./assets/bg/layer2/tree3.png')
    ],
    [
      loadImage('./assets/bg/layer3/flower1.png'),
      loadImage('./assets/bg/layer3/flower2.png')
    ],
    [
      loadImage('./assets/bg/layer4/floor.png')
    ]
  ];

  horseAssets = [
    loadImage('./assets/horse/horse1.png'),
    loadImage('./assets/horse/horse2.png'),
  ]

  obstacleAssets = [
    loadImage('./assets/obstacles/obstacle1.png'),
    loadImage('./assets/obstacles/obstacle2.png'),
    loadImage('./assets/obstacles/obstacle3.png')
  ]

  backgroundImage = loadImage('./assets/bg/bg.jpeg')
  pixelFont = loadFont('./assets/pixelFont.ttf')
  startImage = loadImage('./assets/Start.png')
  endImage = loadImage('./assets/Success.png')

  startMusic = loadSound('./assets/sounds/start.mp3')
  gameMusic = loadSound('./assets/sounds/game.m4a')
  jumpSound = loadSound('./assets/sounds/jump.mp3')
}

// Sets up canvas and initial sprite positions
function setup() {
  createCanvas(700, 400); // Create a canvas
  imageMode(CENTER);
  angleMode(DEGREES);

  // Horse starts in the left part of the canvas
  horseSprite = makeHorseSprite(width * 0.2, height * 0.5, horseAssets);

  // We always start with an obstacle outside of the canvas
  const startingObstacleAsset = obstacleAssets[0];
  obstacleSprites = [
    makeObstacleSprite(width + 200, floorY() - startingObstacleAsset.height / 2 - 10, startingObstacleAsset)
  ];

  // Initial background sprites are randomly generated
  for (let layerIndex = 0; layerIndex < backgroundAssets.length; layerIndex++) {
    let lastSpriteLeftEdge = 0;
    let sprites = [];
    while (lastSpriteLeftEdge < width) {
      let sprite = generateBackgroundSprite(layerIndex, lastSpriteLeftEdge);
      sprites.push(sprite);
      lastSpriteLeftEdge = sprite.centerX - sprite.image.width / 2;
    }

    backgroundSpriteLayers.push(sprites)
  }

  // Initial snowflakes
  for (let i = 0; i < 300; i++) {
    // Add a new snowflake object to the array
    snowflakes.push(new Snowflake());
  }

  startMusic.setLoop(true);
  gameMusic.setLoop(true);
  jumpSound.setLoop(false);
}

// Draws opening, main game, game over, win screens
function draw() {
  updateMusic();
  if (currentScreen == 0) {
    drawSnowflakes();
    image(startImage, width/2, height/2, width, height);
  } else if (currentScreen == 3) {
    image(endImage, width/2, height/2, width, height);
    drawSnowflakes();
  } else {
    stroke(color('white'));
    strokeWeight(4)
    image(backgroundImage, width/2, height/2)

    updateHorse();
    if (currentScreen == 1) {
      update(); //update sprite position, collision 
    }
    drawAllSprites();
    drawSnowflakes();
    drawScore();
    

    if (currentScreen == 2) {
      drawGameOver();
    }
  }
}

function updateMusic() {
  if (currentScreen == 0) {
    if (!startMusic.isPlaying()){
      startMusic.play();
    }

    if (gameMusic.isPlaying()) {
      gameMusic.stop();
    }
  } else {
    if (startMusic.isPlaying()) {
      startMusic.stop();
    }

    if (!gameMusic.isPlaying()) {
      gameMusic.play();
    }
  }
}

function updateHorse() {
  // ---- Horse update
  //when horse is above ground, apply velocity to horse's position, and apply velocity to gravity. 
  if (horseSprite.bottomY() < floorY() || horseSprite.velocityY !== 0 && horseSprite.centerY < height + horseSprite.image().height) {
    horseSprite.centerY += horseSprite.velocityY;
    horseSprite.velocityY += gravity;

    // Check if the horse has now hit the floor
    if (horseSprite.bottomY() >= floorY() && currentScreen != 2) {
      horseSprite.centerY = floorY() - horseSprite.image().height / 2; // Snap the horse to the ground
      horseSprite.velocityY = 0; // Stop vertical motion
      horseSprite.isJumping = false; // Reset jumping flag
    }
  }

  // Advance the horse animation
  animationFrameCounter++;
  if (animationFrameCounter === horseAnimationFrameGap) {
    animationFrameCounter = 0;
    horseSprite.currentFrame++;

    if (horseSprite.currentFrame === horseSprite.images.length) {
      horseSprite.currentFrame = 0;
    }
  }
}

// Advances positions of all the sprites and checks for collisions
function update() {
  // ---- Background update
  //layer index for background depth
  for (let layerIndex = 0; layerIndex < backgroundSpriteLayers.length; layerIndex++) {
    const isLastLayer = layerIndex === backgroundSpriteLayers.length-1;
    const speed = isLastLayer ? modifiedSpeed() : backgroundLayerConfigs[layerIndex].speed;
    const sprites = backgroundSpriteLayers[layerIndex];

    for (let sprite of sprites) {
      sprite.centerX -= speed;
    }

    // Remove the first sprite if it has fully left the canvas
    const firstSprite = sprites[0];
    if (firstSprite.centerX + firstSprite.image.width / 2 < 0) {
      backgroundSpriteLayers[layerIndex].shift();
    }

    // Generate a new sprite if the last one has entered the canvas
    const lastSprite = sprites[sprites.length - 1];
    if (lastSprite.centerX - lastSprite.image.width / 2 < width) {
      backgroundSpriteLayers[layerIndex].push(generateBackgroundSprite(layerIndex, lastSprite.centerX - lastSprite.image.width / 2));
    }
  }

  // ---- Obstacle update
  for (let obstacleSprite of obstacleSprites) {
    obstacleSprite.centerX -= modifiedSpeed();

    if (!obstacleSprite.isConsumed) {
      // Check if the horse has collided with this obstacle
      let distanceX = abs(horseSprite.centerX - obstacleSprite.centerX);
      let distanceY = abs(horseSprite.centerY - obstacleSprite.centerY);
      let collisionDistanceX = horseSprite.image().width / 2 + obstacleSprite.image.width / 2 - 10;
      let collisionDistanceY = horseSprite.image().height / 2 + obstacleSprite.image.height / 2 - 10;
      
      // Update score when an obstacle is consumed
      if (distanceX < collisionDistanceX && distanceY < collisionDistanceY) {
        if (obstacleSprite.image === obstacleAssets[0]) {
          currentScreen = 2
          horseSprite.velocityY = -10
          horseSprite.isJumping = true
          continue
        } else if (obstacleSprite.image === obstacleAssets[1]) {
          score += 10
        } else {
          score += 50
        }
        obstacleSprite.isConsumed = true

        if (score >= winScore) {
          currentScreen = 3
        }
      }   
    } 
  }  

  // Remove the first obstacle when it has left the screen
  if (obstacleSprites.length > 0) {
    const firstObstacle = obstacleSprites[0];
    if (firstObstacle.centerX + firstObstacle.image.width / 2 < 0) {
      obstacleSprites.shift();
    }
  }

  // If the last obstacle has entered the canvas, generate the next one
  if (obstacleSprites.length > 0) {
    const lastObstacle = obstacleSprites[obstacleSprites.length - 1];
    if (lastObstacle.centerX - lastObstacle.image.width / 2 < width) {
      const newCenterX = lastObstacle.centerX + random(obstacleDistanceRange[0], obstacleDistanceRange[1]);
      const randomNumber = random(0,11)
      let asset;
      if (randomNumber < 5) {
        asset = obstacleAssets[0];
      } else if (randomNumber < 10) {
        asset = obstacleAssets[1];
      } else {
        asset = obstacleAssets[2];
      }
      obstacleSprites.push(makeObstacleSprite(newCenterX, lastObstacle.centerY, asset));
    }
  }
}

// Draws all the sprites
function drawAllSprites() {

  // Background sprites
  for (const sprites of backgroundSpriteLayers) {
    for (const sprite of sprites) {
      image(sprite.image, sprite.centerX, sprite.centerY);
    }
  }

  // Horse sprite
  let horseImage;
  if (horseSprite.isJumping) {
    horseImage = horseSprite.images[0];
  } else {
    horseImage = horseSprite.image();
  }

  image(horseImage, horseSprite.centerX, horseSprite.centerY);

  // Obstacle sprites
  for (const sprite of obstacleSprites) {
    if (!sprite.isConsumed) {
      image(sprite.image, sprite.centerX, sprite.centerY);
    }
  }  
}

// Draws score on top right of the screen
function drawScore() {
  fill(color('black'));
  textSize(24);
  textAlign(RIGHT, TOP);
  stroke(color('white'));
  strokeWeight(4) 
  textFont(pixelFont)
  text(score, width - 20, 20);
}

// Draws the game over text in the center
function drawGameOver() {
  fill(color('black'));
  stroke(color('white'));
  strokeWeight(4)
  textSize(32);
  textAlign(CENTER, CENTER);
  text('GAME OVER', width / 2, height / 2);
}

function drawSnowflakes() {
  // Update and display each snowflake in the array
  let currentTime = frameCount / 60;

  for (let flake of snowflakes) {
    // Update each snowflake position and display
    flake.update(currentTime);
    flake.display();
  }
}

// Handles the game start and jump key
function keyPressed() {
  if (key === ' ') {
    if (currentScreen == 0) {
      currentScreen = 1
    } else if (currentScreen == 1 && !horseSprite.isJumping) {
      horseSprite.velocityY = -10; // Initial upward velocity
      horseSprite.isJumping = true;
      jumpSound.play();
    }
  }
}

function mousePressed() {
  userStartAudio();
  updateMusic();
}

//------- Helper functions
// Chooses parameters of a new background sprite and saves it
function generateBackgroundSprite(layerIndex, lastSpriteLeftEdge) {
  const image = random(backgroundAssets[layerIndex]);
  const config = backgroundLayerConfigs[layerIndex];
  const spacing = config.horizontalSpacing;
  const verticalVariance = config.verticalVariance;
  let centerX;
  if (lastSpriteLeftEdge == 0) {
    centerX = 0;
  } else {
    centerX = lastSpriteLeftEdge + image.width / 2 + random(spacing[0], spacing[1]);
  }
  const centerY = config.y * height;

  return makeBackgroundSprite(
    centerX,
    random(centerY - verticalVariance, centerY + verticalVariance),
    image
  )
}

// Returns an object that contains all the information about
// where and what to draw for each background sprite
function makeBackgroundSprite(centerX, centerY, image) {
  return {
    centerX: centerX,
    centerY: centerY,
    image: image
  };
}

// Returns an object that holds the current state of the horse
// It also contains animation information
function makeHorseSprite(centerX, centerY, images) {
  return {
    centerX: centerX,
    centerY: centerY,
    velocityY: 0,
    isJumping: false,
    images: images,
    currentFrame: 0,
    bottomY: function() { // Helper function for bottom edge Y value
      return this.centerY + this.image().height / 2;
    },
    image: function() { // Helper function for current image
      return this.images[this.currentFrame];
    }
  };
}

// Returns an object that holds the current state of each obstacle
function makeObstacleSprite(centerX, centerY, image) {
  return {
    centerX: centerX,
    centerY: centerY,
    image: image,
    isConsumed: false
  };
}

// Height of the floor in pixels
function floorY() {
  return height * relativeFloorY;
}

// Running speed modified by current score
function modifiedSpeed() {
  return runningSpeed + 5 * (score / 250)
}
