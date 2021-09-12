class MyWorld extends World
{
	static get Palette()
	{
		let palette = 
		{
			DarkBlue: 0x2b0f54,
			DarkRed: 0xab1f65,
			Red: 0xff4f69,
			White: 0xfff7f8,
			Orange: 0xff8142,
			Yellow: 0xffda45,
			Blue: 0x3368dc,
			LightBlue: 0x49e7ec
		}
		return palette;
	}
	constructor()
	{
		super();

		this.keyBinds = 
		{
			fire: "ArrowUp",
			rotateLeft: "ArrowLeft",
			rotateRight: "ArrowRight",
			forward: "KeyW",
			backward: "KeyS",
			left: "KeyA",
			right: "KeyD",
			run: "ShiftLeft"
		};

		let keyBindsArray = Object.values(this.keyBinds);

		window.addEventListener("keydown", function(e)
		{
			if(keyBindsArray.indexOf(e.code) > -1)
			{
				e.preventDefault();
			}
		}, false);

		let introGroup = new IntroGroup(this);
		let gameGroup = new GameGroup(this);
		let outroGroup = new OutroGroup(this);
		this.addChild(introGroup);
		introGroup.resetIntroGroup();
		introGroup.startIntroGroup();

		introGroup.onIntroComplete.addListener(this, () =>
		{
			this.removeChild(introGroup);
			this.addChild(gameGroup);
			gameGroup.newLevel();
		});

		outroGroup.onOutroComplete.addListener(this, () =>
		{
			this.removeChild(outroGroup);
			this.addChild(introGroup);
			introGroup.startIntroGroup();
		});

		gameGroup.onLevelReset.addListener(this, (finished) =>
		{
			this.removeChild(gameGroup);
			if(finished)
			{
				this.addChild(outroGroup)
				outroGroup.startOutroGroup();
			}
			else
			{
				this.addChild(introGroup);
				introGroup.startIntroGroup();
			}
		});
	}
}

class Level
{
	constructor(enemys, size, chambers, hostages, medikits)
	{
		this.enemys = enemys
		this.size = size;
		this.chambers = chambers;
		this.hostages = hostages;
		this.medikits = medikits;
	}
}

class IntroGroup extends Spatial
{
	constructor(world)
	{
		super(world);
		
		this.update = (deltaTimeSec) =>
		{
			if(!camChanged && spaceShip.worldPosition[0] < camStartX)
			{
				this.world.camera.position = [camStartX, 0, camStartZ - 6];
				this.world.camera.target = [-this.world.camTargetDis, 0, this.world.camTargetDis];
				
				let ang = Math.atan2(spaceStation.worldPosition[2] - world.camera.position[2],
					spaceStation.worldPosition[0] - world.camera.position[0]);

				this.world.camera.target = 
				[
					Math.cos(ang) * this.world.camTargetDis, 
					0, 
					Math.sin(ang) * this.world.camTargetDis
				];

				this.world.camera.setProperties();
				spaceShip.position[0] -= 2;
				spaceShip.speed.x *= 0.8;
				camChanged = true;
			}
		}
		this.resetIntroGroup = () =>
		{
			
			textTimer.reset(false);
			startGameTimer.reset(false);
			textIndex = 0;
			spaceShip.position = [...spaceShipInitPos];
			spaceStation.position = [...spaceStaionInitPos];
			spaceShip.speed.x = 0;
			world.events.onKeyDown = null;
			camChanged = false;
		}
		this.startIntroGroup = () =>
		{
			world.hudItems.length = 0;
			world.hudItems[0] = introTexts[0];
			this.world.camera.position = [camStartX, 0, camStartZ];
			this.world.camera.target = [this.world.camTargetDis, 0, this.world.camTargetDis];
			this.world.camera.setProperties();
			spaceShip.speed.setTo(spaceShipInitSpeed);
			textTimer.reset(true);
			world.events.onKeyDown = ((event) =>
			{
				if(textIndex > 0)
				{
					this.resetIntroGroup();
					this.onIntroComplete.dispatch();
				}
			});
		}

		let introTexts = 
		[
			"Distress signal detected from",
			"deep space research station vdg26e",
			"Last contact at sd15.78.94:10:56.",
			"All the robots have turned evil",
			"Navigate to sector ks937d and dock with station",
			"Eliminate all hostile robots",
			"Rescue all hostages"
		];

		let spaceShipInitPos = [0, 0, 0];
		let spaceShipInitSpeed = new Point(-0.5, 0);
		let spaceStaionInitPos = [-15, 0, 0];

		let textIndex = 0;
		let textTimer = new Timer(3);
		textTimer.onComplete = () =>
		{
			textIndex ++;
			if(textIndex < introTexts.length)
			{
				world.hudItems[0] = introTexts[textIndex];
				textTimer.reset(true);
			}
			else
			{
				startGameTimer.reset(true);
			}
		}

		textTimer.reset(true);

		let camStartX = -2;
		let camStartZ = -0.5;

		let startGameTimer = new Timer(4);
		world.timers.push(textTimer, startGameTimer)
		startGameTimer.onComplete = () =>
		{
			this.resetIntroGroup();
			this.onIntroComplete.dispatch();
		}

		this.onIntroComplete = new Signal(this);

		let spaceStation = new SpaceStation(world);
		world.addChild(spaceStation, this);
		
		let spaceShip = new SpaceShip(world); 
		world.addChild(spaceShip, this);
		let camChanged = false;
	}
}

class OutroGroup extends Spatial
{
	constructor(world)
	{
		super(world);
		
		this.update = (deltaTimeSec) =>
		{
			if(spaceShip.worldPosition[0] > 0)
			{
				this.resetOutroGroup();
				this.onOutroComplete.dispatch();
			}
		}
		this.resetOutroGroup = () =>
		{
			spaceShip.position = [...spaceShipInitPos];
			spaceStation.position = [...spaceStaionInitPos];
			spaceShip.speed.x = 0;
		}
		this.startOutroGroup = () =>
		{
			world.hudItems.length = 0;
			world.hudItems[0] = hudText;
			world.camera.position = [camStartX, 0, camStartZ];
				
			let ang = Math.atan2(spaceStation.worldPosition[2] - world.camera.position[2],
				spaceStation.worldPosition[0] - world.camera.position[0]);

			this.world.camera.target = 
			[
				Math.cos(ang) * this.world.camTargetDis, 
				0, 
				Math.sin(ang) * this.world.camTargetDis
			];

			this.world.camera.setProperties();
			spaceShip.speed.setTo(spaceShipInitSpeed);
		}
		let camStartX = -2;
		let camStartZ = -0.5;
		let hudText = "Great job, mission complete!";
		let spaceShipInitPos = [-11, 0, 0];
		let spaceShipInitSpeed = new Point(1, 0);
		let spaceStaionInitPos = [-15, 0, 0];
		let spaceStation = new SpaceStation(world);
		world.addChild(spaceStation, this);
		
		let spaceShip = new SpaceShip(world); 
		spaceShip.rotation = Math.PI;
		world.addChild(spaceShip, this);

		this.onOutroComplete = new Signal(this);
		this.resetOutroGroup();
	}
}

class SpaceShip extends Spatial
{
	constructor(world, position = [0, 0, 0])
	{
		super(world, position);

		let size = 0.125;

		let a = 0.25 * size;
		let b = 2 * size;
		let c = 1 * size;
		let d = 0.5 * size;
		let e = 0.75 * size;
		let f = 1.25 * size;
		let g = 0.1 * size;
		let h = 0.875 * size;

		let fuselage = new Spatial(world, [a, 0, 0], new Cube(world.gl, [b, c, c], World.HextoRGB(MyWorld.Palette.White)));
		let cockpit = new Spatial(world, [-c, 0, 0], new Cube(world.gl, [d, e, e], World.HextoRGB(MyWorld.Palette.Blue)));
		let lEngine = new Spatial(world, [e, 0, e], new Cube(world.gl, [c, d, d], World.HextoRGB(MyWorld.Palette.Red)));
		let rEngine = new Spatial(world, [e, 0, -e], new Cube(world.gl, [c, d, d], World.HextoRGB(MyWorld.Palette.Red)));
		let lWing = new Spatial(world, [e, 0, f], new Cube(world.gl, [e, g, d], World.HextoRGB(MyWorld.Palette.White)));
		let rWing = new Spatial(world, [e, 0, -f], new Cube(world.gl, [e, g, d], World.HextoRGB(MyWorld.Palette.White)));
		let lFin = new Spatial(world, [h, d, c], new Cube(world.gl, [e, d, g], World.HextoRGB(MyWorld.Palette.White)));
		let rFin = new Spatial(world, [h, d, -c], new Cube(world.gl, [e, d, g], World.HextoRGB(MyWorld.Palette.White)));

		world.addChildren(
			[fuselage,
			cockpit,
			lEngine,
			rEngine,
			lWing,
			rWing,
			lFin,
			rFin], this);
	}
}

class SpaceStation extends Spatial
{
	constructor(world, position = [0, 0, 0])
	{
		super(world, position);
		let size = 1.5;
		let a = 5 * size;
		let b = 1 * size;
		let c = 1 * size;
		let d = 1.5 * size;
		let e = 3 * size;
		let f = 0.5 * size;
		let g = 0.2 * size;

		let main = new Spatial(world, [0, 0, 0], new Cube(world.gl, [a, b, a], World.HextoRGB(MyWorld.Palette.Orange)));
		let top = new Spatial(world, [0, c, 0], new Cube(world.gl, [d, b, d], World.HextoRGB(MyWorld.Palette.DarkRed)));
		let bottom = new Spatial(world, [0, -c, 0], new Cube(world.gl, [d, b, d], World.HextoRGB(MyWorld.Palette.DarkRed)));
		let topSpire = new Spatial(world, [0, b + c / 2 + e / 2, 0] , new Cube(world.gl, [f, e, f], World.HextoRGB(MyWorld.Palette.Blue)));
		let bottomSpire = new Spatial(world, [0, -(b + c / 2 + e / 2),0 ], new Cube(world.gl, [f, e, f], World.HextoRGB(MyWorld.Palette.Blue)));
		let hanger = new Spatial(world, [a / 2, 0, 0], new Cube(world.gl, [g, g, f], World.HextoRGB(MyWorld.Palette.DarkBlue)));
		world.addChildren(
		[
			main,
			top,
			bottom,
			topSpire,
			bottomSpire,
			hanger
		], this);
	}
}

class GameGroup extends Spatial
{
	constructor(world)
	{
		super(world);
		this.newLevel = (levelObj = levels[currentLevel]) =>
		{
			levelFinished = false;
			world.hudItems.length = 0;
			world.hudItems.push(hostagesText, 0,robotsText, 0, healthText, 0);
			let fillGrid = mazeCreator.makeMaze(levelObj.size, levelObj.size, levelObj.chambers);
			let mapFillGrid = generateMapData(fillGrid, 3);

			let ends = [];
			mapFillGrid.forEach((obj, x, y) =>
			{
				if(!obj.filled)
				{
					ends.push(new Point(x, y));
				}
			});

			let ranEndIndex = MathsFunctions.RandomPickIndex(ends);
			let ranEnd = ends[ranEndIndex];
			ends.splice(ranEndIndex, 1);

			player = playerPool.obtain({world: world, position : [ranEnd.x, 0, ranEnd.z]})
			for(let x = ranEnd.x - 5; x < ranEnd.x + 5; x++)
			{
				for(let y = ranEnd.z - 5; y < ranEnd.z + 5; y++)
				{
					let index = ends.findIndex((end) =>
					{
						return end.x === x && end.z === y;
					});
					if(index >= 0)
					{
						ends.splice(index, 1);
					}
				}
			}

			world.addChild(player, this);
			player.calcInitFacing(mapFillGrid);
			world.hudItems[healthIndex] = Math.round(player.health * 100);


			player.onCollide.addListener(this, (player, spatial) =>
			{
				
				if(spatial.constructor === EnemyBullet)
				{
					let enemyBullet = spatial;
					player.health -= enemyBullet.damage;
					if(Math.round(player.health * 100) <= 0)
					{
						restartOnNextFrame = true;
					}
					world.hudItems[healthIndex] = Math.round(player.health * 100);
				}
			});
			
			tilemap = tilemapPool.obtain(
			{
				world: world,
				position: [0, 0, 0],
				wallSpatialClass: MyWallSpatial,
				floorSpatialClass: MyFloorSpatial,
				refSpatial: player,
				mapFillGrid: mapFillGrid
			});
			
			tilemap.createTileSpatials();
			world.addChild(tilemap, this);
			world.tilemap = tilemap;

			tilemap.setWallSpatialCollisionGroups(Player.CollisionID + PlayerBullet.CollisionID + EnemyBullet.CollisionID);

			floor = new Spatial(world,[mapFillGrid.xDim / 2,- 0.5,mapFillGrid.zDim / 2], 
				new Cube(world.gl, [mapFillGrid.xDim, 1, mapFillGrid.zDim],
				World.HextoRGB(MyWorld.Palette.DarkBlue)));
			floor.alwaysDraw = true;

			ceiling = new Spatial(world,[mapFillGrid.xDim / 2,2.5,mapFillGrid.zDim / 2], 
				new Cube(world.gl, [mapFillGrid.xDim, 1, mapFillGrid.zDim],
				World.HextoRGB(MyWorld.Palette.Red)));
			ceiling.alwaysDraw = true;

			world.addChildren([floor, ceiling], this);

			world.collisionGrid.addSpatial(player);
			world.hudItems[robotsIndex] = levelObj.enemys;

			for(let i = 0; i < levelObj.enemys; i++)
			{
				let endIndex = MathsFunctions.RandomPickIndex(ends);

				let enemy = enemySpatialPool.obtain({world: world, position:[0,0,0], end: ends[endIndex],
				mapFillGrid: mapFillGrid, moves: 5, player: player});
				enemySpatials.push(enemy);
				world.addChild(enemy, this);
				world.collisionGrid.addSpatial(enemy);
				enemy.navigate();
				ends.splice(endIndex, 1);
				enemy.onStartDestroyed.addListener(this, (enemy) =>
				{
					world.collisionGrid.removeSpatial(enemy);
				});
				enemy.onDoneDestroyed.addListener(this, (enemy) =>
				{
					world.removeChild(enemy);
					enemySpatials.splice(enemySpatials.findIndex((item) =>
					{
						return item === enemy
					}), 1);
					enemySpatialPool.free(enemy);
					world.hudItems[robotsIndex] = enemySpatials.length;
					if(enemySpatials.length === 0 && hostages.length === 0)
					{
						//game finished
						levelFinished = true;
						restartOnNextFrame = true;
					}
				});
			}

			world.hudItems[hostagesIndex] = levelObj.hostages;

			for(let i = 0; i < levelObj.hostages; i++)
			{
				let endIndex = MathsFunctions.RandomPickIndex(ends);
				let end = ends[endIndex];

				let hostage = hostagePool.obtain({world: world, position:[end.x,0,end.z]});
				hostages.push(hostage);
				hostage.onCollide.addListener(this, (hostage, spatial) =>
				{
					if(spatial.constructor === Player)
					{
						hostagePool.free(hostage);
						world.removeChild(hostage);
						hostages.splice(hostages.findIndex((item) =>
						{
							return item === hostage;
						}), 1);
						world.collisionGrid.removeSpatial(hostage);
						world.hudItems[hostagesIndex] = hostages.length;
						if(hostages.length === 0 && enemySpatials.length === 0)
						{
							//game finished
							levelFinished = true;
							restartOnNextFrame = true;
						}
					}
				});
				world.addChild(hostage, this);
				world.collisionGrid.addSpatial(hostage);
				ends.splice(endIndex, 1);
			}

			for(let i = 0; i < levelObj.medikits; i++)
			{
				let endIndex = MathsFunctions.RandomPickIndex(ends);
				let end = ends[endIndex];

				let mediKit = mediKitPool.obtain({world: world, position:[end.x,0,end.z]});
				mediKits.push(mediKit);
				mediKit.onCollide.addListener(this, (mediKit, spatial) =>
				{
					if(spatial.constructor === Player)
					{
						mediKitPool.free(mediKit);
						world.removeChild(mediKit);
						mediKits.splice(mediKits.findIndex((item) =>
						{
							return item === mediKit;
						}), 1);
						world.collisionGrid.removeSpatial(mediKit);
						player.health += mediKit.healthBoost;
						if(player.health > 1)
						{
							player.health = 1;
						}
						world.hudItems[healthIndex] = Math.round(player.health * 100);
					}
				});
				world.addChild(mediKit, this);
				world.collisionGrid.addSpatial(mediKit);
				ends.splice(endIndex, 1);
			}
			
		}


		let levels =
		[
			new Level(100, 25, 10, 20, 40)
		];

		let currentLevel = 0;

		let generateMapData = (fillGrid, spacing = 1) =>
		{
			let mapXDim = (fillGrid.xDim * (spacing + 1)) + 1;
			let mapZDim = (fillGrid.zDim * (spacing + 1)) + 1;
			let mapFillGrid = new FillGrid(mapXDim, mapZDim);
			fillGrid.grid.forEach((col, x) =>
			{
				col.forEach((cell, y) =>
				{
					cell.enclosed.forEach((val, index) =>
					{
						if(val)
						{
							let dir = mazeCreator.fillGrid.directionObj.directions[index].point;
							let ax = (spacing + 1) * x;
							let ay = (spacing + 1) * y;
							let cx = ax + (1 + (spacing / 2));
							let cy = ay + (1 + (spacing / 2));
							let d = cx - (((spacing + 1) * x) + 1);
							for(let i = -d - 1; i < d + 1; i++)
							{
								let xGrid = cx + (i * (1 - Math.abs(dir.x))) + (dir.x * (d + Math.abs(Math.min(dir.x, 0))));
								let yGrid = cy + (i * (1 - Math.abs(dir.z))) + (dir.z * (d + Math.abs(Math.min(dir.z, 0))));
								mapFillGrid.grid[xGrid][yGrid].filled = true;
							}
						}
					});
				});
			});
			return mapFillGrid;
		}
		let resetLevel = () =>
		{
			tilemapPool.free(tilemap);
			world.removeChild(tilemap);
			tilemap = null;
			playerPool.free(player);
			world.collisionGrid.removeSpatial(player);
			world.removeChild(player);
			player = null;
			enemySpatialPool.freeAll(enemySpatials);
			world.collisionGrid.removeSpatials(enemySpatials);
			world.removeChildren(enemySpatials);
			enemySpatials.length = 0;
			hostagePool.freeAll(hostages);
			world.collisionGrid.removeSpatials(hostages);
			world.removeChildren(hostages);
			hostages.length = 0;
			mediKitPool.freeAll(mediKits);
			world.collisionGrid.removeSpatials(mediKits);
			world.removeChildren(mediKits);
			mediKits.length = 0;
			world.removeChild(floor);
			world.removeChild(ceiling);
			floor = null;
			ceiling = null
		}
		let gridSquarePool = new GridSquarePool();
		let gridPathPool = new GridPathPool();
		let gridPathFinderPool = new GridPathFinderPool();
		let collisionGrid = new CollisionGrid(world, 200, 200);
		world.collisionGrid = collisionGrid;
		
		let mazeCreator = new MazeCreator(gridSquarePool, gridPathPool, gridPathFinderPool);
		let enemySpatialPool = new EnemySpatialPool();
		let playerPool = new PlayerPool();
		let hostagePool = new HostagePool();
		let mediKitPool = new MediKitPool();
		let tilemapPool = new TilemapPool();
		let player = null;
		let enemySpatials = [];
		let hostages = [];
		let mediKits = [];
		let tilemap = null;
		let hostagesText = "Hostages: ";
		let robotsText = " Robots: ";
		let healthText = " Health: ";
		let hostagesIndex = 1;
		let robotsIndex = 3;
		let healthIndex = 5;
		world.hudItems.length = 0;
		let floor = null;
		let ceiling = null;
		let restartOnNextFrame = false;
		let levelFinished = false;
		this.onLevelReset = new Signal(this);
		this.update = (deltaTimeSec) =>
		{
			if(restartOnNextFrame)
			{
				restartOnNextFrame = false;
				resetLevel();
				this.onLevelReset.dispatch(levelFinished);
			}
		}
	}
}

class Player extends Spatial
{
	static get CollisionID()
	{
		return 1 << 1;
	}
	constructor(world, position)
	{
		super(world, position);
		
		this.calcInitFacing = (mapFillGrid) =>
		{
			let direction = new Direction();
			gridPathFinder = gridPathFinderPool.obtain({fillGrid: mapFillGrid, start: this.gridPos,
				end: 10, gridPaths: null, gridSquarePool: gridSquarePool,
				gridPathPool: gridPathPool});
			let obj = gridPathFinder.process();
			let path = gridPathFinder.gridPaths[obj.pathIndex];
			let dir = direction.directions[path.gridSquares[1].direction - 1].point;
			this.gun.rotation = Math.atan2(dir.x, dir.z);
			this.world.camera.target = [Math.sin(this.gun.rotation) * this.world.camTargetDis, 1, Math.cos(this.gun.rotation) * this.world.camTargetDis];
			gridPathFinderPool.free(gridPathFinder);
			gridPathFinder = null;
			this.size = [0.9, 0.9];
		}
		this.keyStates =
		{
			left: false,
			right: false,
			forward: false,
			backward: false,
			fire: false,
			run: false,
			rotateLeft: false,
			rotateRight: false
		}
		
		this.moveSpeed = 3;
		this.runSpeed = 6;
		this.rotateSpeed = Math.PI / 1.6;
		this.strafeSpeed = 3;
		this.collisionGroup = MyWallSpatial.CollisionID + EnemySpatial.CollisionID 
			+ EnemyBullet.CollisionID + Hostage.CollisionID + MediKit.CollisionID;
		this.gun = new Spatial(world, [0, 0, 0], new Cube(world.gl, [0.2, 0.5, 4], World.HextoRGB(MyWorld.Palette.LightBlue)));
		world.addChild(this.gun, this);
		this.bulletPool = new PlayerBulletPool();
		this.fireTimer = new Timer(0.5);
		world.timers.push(this.fireTimer);
		this.fireTimer.onComplete = () =>
		{
			this.canFire = true;
		}
		this.canFire = true;
		this.bulletSpeed = 8;
		let gridSquarePool = new GridSquarePool();
		let gridPathPool = new GridPathPool();
		let gridPathFinderPool = new GridPathFinderPool();
		let gridPathFinder = null;
		this.activeBullets = [];
		this.initInput();
	}
	initInput()
	{
		let setKeyStates = (code, value) =>
		{
			let keyBinds = this.world.keyBinds;
			if(keyBinds.right ===  code)
			{
				this.keyStates.right = value;
			}
			if(keyBinds.left === code)
			{
				this.keyStates.left = value;
			}
			if(keyBinds.forward === code)
			{
				this.keyStates.forward = value;
			}
			if(keyBinds.backward === code)
			{
				this.keyStates.backward = value;
			}
			if(keyBinds.fire === code)
			{
				this.keyStates.fire = value;
			}
			if(keyBinds.run === code)
			{
				this.keyStates.run = value;
			}
			if(keyBinds.rotateLeft === code)
			{
				this.keyStates.rotateLeft = value;
			}
			if(keyBinds.rotateRight === code)
			{
				this.keyStates.rotateRight = value;
			}
		}
		this.world.events.onKeyDown = ((event) =>
		{
			setKeyStates(event.code, true);
		});
		this.world.events.onKeyUp = ((event) =>
		{
			setKeyStates(event.code, false);
		});
	}
	set(objectArgs)
	{
		super.set(objectArgs);
		this.initInput();
	}
	reset()
	{
		super.reset();
		this.fireTimer.reset(false);
		this.canFire = true;
		this.bulletPool.freeAll(this.activeBullets);
		this.world.removeChildren(this.activeBullets);
		this.world.collisionGrid.removeSpatials(this.activeBullets);
		this.activeBullets.length = 0;
		this.onCollide.listeners.length = 0;
		this.world.events.onKeyDown = null;
		this.world.events.onKeyUp = null;
		let keyStatesKeys = Object.keys(this.keyStates);
		keyStatesKeys.forEach((key) =>
		{
			this.keyStates[key] = false;
		});
	}
	update(deltaTimeSec)
	{
		this.gun.angularVelocity = 0;
		this.speed.x = 0;
		this.speed.z = 0;

		if(this.keyStates.right)
		{
			this.speed.x = Math.sin(this.gun.rotation - Math.PI / 2) * this.strafeSpeed;
			this.speed.z = Math.cos(this.gun.rotation - Math.PI / 2) * this.strafeSpeed; 
		}
		else if(this.keyStates.left)
		{
			this.speed.x = Math.sin(this.gun.rotation + Math.PI / 2) * this.strafeSpeed;
			this.speed.z = Math.cos(this.gun.rotation + Math.PI / 2) * this.strafeSpeed; 
		}
		if(this.keyStates.rotateLeft)
		{
			this.gun.angularVelocity = this.rotateSpeed;
		}
		else if(this.keyStates.rotateRight)
		{
			this.gun.angularVelocity = -this.rotateSpeed;
		}
		if(this.keyStates.forward)
		{
			let moveSpeed = this.keyStates.run ? this.runSpeed : this.moveSpeed;
			this.speed.x += Math.sin(this.gun.rotation) * moveSpeed;
			this.speed.z += Math.cos(this.gun.rotation) * moveSpeed;
		}
		else if(this.keyStates.backward)
		{
			let moveSpeed = this.keyStates.run ? this.runSpeed : this.moveSpeed;
			this.speed.x += Math.sin(this.gun.rotation) * -moveSpeed;
			this.speed.z += Math.cos(this.gun.rotation) * -moveSpeed;
		}
		if(this.keyStates.fire && this.canFire)
		{
			let bullet = this.bulletPool.obtain({world: this.world, 
				position: [...this.worldPosition]});
			this.activeBullets.push(bullet);
			bullet.position[0] += Math.sin(this.gun.rotation) * 2;
			bullet.position[1] = 0.5
			bullet.position[2] += Math.cos(this.gun.rotation) * 2;
			this.world.addChild(bullet, this.parent);
			bullet.speed.x = Math.sin(this.gun.rotation) * this.bulletSpeed;
			bullet.speed.z = Math.cos(this.gun.rotation) * this.bulletSpeed;
			bullet.rotation = this.gun.rotation;
			this.world.collisionGrid.addSpatial(bullet);
			bullet.onCollide.addListener(bullet, (bullet) =>
			{
				this.bulletPool.free(bullet);
				this.world.collisionGrid.removeSpatial(bullet);
				this.world.removeChild(bullet);
				this.activeBullets.splice(this.activeBullets.findIndex((activeBullet) =>
				{
					return bullet === activeBullet;
				}), 1)
			});
			this.canFire = false;
			this.fireTimer.reset(true);
		}

		this.world.camera.position = [this.position[0], 1, this.position[2]];
		this.world.camera.target = [Math.sin(this.gun.rotation) * this.world.camTargetDis, 1, Math.cos(this.gun.rotation) * this.world.camTargetDis];
		this.world.camera.setProperties();
	}
}

class EnemySpatial extends Spatial
{
	static get CollisionID()
	{
		return 1 << 2;
	}
	constructor(world, position, end, mapFillGrid, moves, player)
	{
		super(world, position);
		let gridSquarePool = new GridSquarePool();
		let gridPathPool = new GridPathPool();
		let gridPathFinderPool = new GridPathFinderPool();
		let reversing = false;
		let baseColor = World.HextoRGB(MyWorld.Palette.White);
		let baseHitColor = World.HextoRGB(MyWorld.Palette.Red);
		this.size = [0.9, 0.9];
		let base = new Spatial(world, [0,0.3,0], 
			new Cube(world.gl, [0.9, 0.6, 0.9], World.HextoRGB(MyWorld.Palette.White)));
		let body = new Spatial(world, [0,0.9,0], 
			new Cube(world.gl, [0.6, 0.6, 0.6], World.HextoRGB(MyWorld.Palette.Blue)));
		world.addChildren([base, body], this);
		body.angularVelocity = Math.PI;
		this.onCollide.addListener(this, (enemySpatial, spatial) =>
		{
			if(spatial.constructor === PlayerBullet)
			{
				let playerBullet = spatial
				base.cube.color = baseHitColor;
				hitTimer.reset(true);
				this.health -= playerBullet.damage;
				if(Math.round(this.health * 10) <= 0)
				{
					base.speed.x = 10;
					body.speed.x = -10;
					destroyTimer.reset(true);
					this.onStartDestroyed.dispatch(this);
				}
			}
		});    
		let activeBullets = [];
		let hitTimer = new Timer(0.2);
		hitTimer.onComplete = () =>
		{
			base.cube.color = baseColor;
		}
		let playerDisSq = 100;
		let fireTimer = new Timer(2);
		let destroyTimer = new Timer(0.15);
		world.timers.push(fireTimer, hitTimer, destroyTimer);
		let startPoint = new Point(0, 0);
		
		fireTimer.onComplete = () =>
		{
			canFire = true;
		}
		let canFire = true;
		let bulletPool = new EnemyBulletPool();
		let bulletSpeed = 6;
		this.onStartDestroyed = new Signal(this);
		this.onDoneDestroyed = new Signal(this);

		
		destroyTimer.onComplete = () =>
		{
			this.onDoneDestroyed.dispatch(this);
		};

		let _end = end;
		let _mapFillGrid = mapFillGrid;
		let gridPathFinder = null;
		this.set = (objectArgs) =>
		{
			super.set(objectArgs)
			_end = objectArgs.end;
			_mapFillGrid = objectArgs.mapFillGrid;
			navIndex = 0;
			oldDir = null;
			reversing = false;
			player = objectArgs.player;
			newPath();
		}
		this.reset = () =>
		{
			super.reset();
			hitTimer.reset(false);
			fireTimer.reset(false);
			destroyTimer.reset(false);
			this.onStartDestroyed.listeners.length = 0;
			this.onDoneDestroyed.listeners.length = 0;
			canFire = true;
			base.speed.x = 0;
			body.speed.x = 0;
			base.position[0] = 0;
			body.position[0] = 0;
			base.cube.color = World.HextoRGB(MyWorld.Palette.White);
			bulletPool.freeAll(activeBullets);
			world.removeChildren(activeBullets);
			world.collisionGrid.removeSpatials(activeBullets);
			activeBullets.length = 0;
		}
		let newPath = () =>
		{
			startPoint.setTo(_end);
			gridPathFinder = gridPathFinderPool.obtain({fillGrid: _mapFillGrid, start: startPoint,
				end: moves, gridPaths: null, gridSquarePool: gridSquarePool,
				gridPathPool: gridPathPool});
			let obj = gridPathFinder.process();

			currentPath = JSON.parse(JSON.stringify(gridPathFinder.gridPaths[obj.pathIndex]));
			

			currentPath.end = 
				new Point(currentPath.gridSquares[currentPath.gridSquares.length - 1].position.x,
					currentPath.gridSquares[currentPath.gridSquares.length - 1].position.z);
			gridPathFinderPool.free(gridPathFinder);
			pos = currentPath.gridSquares[navIndex].position;
			this.position[0] = pos.x;
			this.position[2] = pos.z;
		}
		this.update = (deltaTimeSec) =>
		{
			if(MathsFunctions.DisSq(this.worldPosition, player.worldPosition) < playerDisSq
				&& canFire)
			{
				let bullet = bulletPool.obtain({world: this.world, 
					position: [this.worldPosition[0], 0.9, this.worldPosition[2]]});
				activeBullets.push(bullet);
					let angTo = Math.atan2(player.worldPosition[0] - this.worldPosition[0],
					player.worldPosition[2] - this.worldPosition[2]);
				bullet.speed.x = Math.sin(angTo) * bulletSpeed;
				bullet.speed.z = Math.cos(angTo) * bulletSpeed;
				bullet.rotation = angTo;
				world.collisionGrid.addSpatial(bullet);
				world.addChild(bullet, this.parent);
				bullet.onCollide.addListener(bullet, (bullet) =>
				{
					bulletPool.free(bullet);
					world.collisionGrid.removeSpatial(bullet);
					world.removeChild(bullet);
					activeBullets.splice(activeBullets.findIndex((item) =>
					{
						return item === bullet
					}), 1);
				});
				canFire = false;
				fireTimer.reset(true);
			}
		}
		this.navigate = () =>
		{
			let reNavigate = false;
			let dir = direction.directions[currentPath.gridSquares[navIndex].direction - 1].point;
			if(oldDir !== dir)
			{
				this.position[0] = this.gridPos.x;
				this.position[2] = this.gridPos.z;
			}
			if(reversing)
			{
				this.speed.x = -dir.x * moveSpeed;
				this.speed.z = -dir.z * moveSpeed;
				if(navIndex === 0)
				{
					navIndex = -1;
					reversing = false;
				}
				else
				{
					oldDir = dir;
				}
			}
			else
			{
				this.speed.x = dir.x * moveSpeed;
				this.speed.z = dir.z * moveSpeed;
				if(dir.x === 0 && dir.z === 0)
				{
					reversing = true;
					navIndex --;
					reNavigate = true;
				}
				else
				{
					oldDir = dir;
				}
			}
			return reNavigate;
		}
		this.onGridPosChanged.addListener(this, () =>
		{
			if(reversing)
			{
				navIndex --;
			}
			else
			{
				navIndex ++;
			}
			if(this.navigate())
			{
				this.navigate();
			}
		});
		let currentPath = null
		let navIndex = 0;
		let oldDir = null;
		let pos = null
		let moveSpeed = 1.5;
		let direction = new Direction();
		newPath();
		this.collisionGroup = Player.CollisionID + PlayerBullet.CollisionID;    
	} 
}

class Hostage extends Spatial
{
	static get CollisionID()
	{
		return 1 << 5;
	}
	constructor(world, position)
	{
		super(world, position);
		let height = 1.2;
		let width = 0.5;
		this.size = [0.5, 0.5];
		let a = 2/5 * height;
		let b = a;
		let c = 1/5 * height;
		let d = 1/2 * height;
		let e = 1/5 * width;
		let f = 3/5 * width;
		let g = 3/10 * width;
		this.solid = false;

		let leg1 = new Spatial(world, [-e, a / 2, 0], new Cube(world.gl, [e, a, e], World.HextoRGB(MyWorld.Palette.LightBlue)));
		let leg2 = new Spatial(world, [e, a / 2, 0], new Cube(world.gl, [e, a, e], World.HextoRGB(MyWorld.Palette.LightBlue)));
		let body = new Spatial(world, [0, a + b / 2, 0], new Cube(world.gl, [f, a, e], World.HextoRGB(MyWorld.Palette.Blue)));
		let head = new Spatial(world, [0, 2 * a + c / 2, 0], new Cube(world.gl, [g, c, e], World.HextoRGB(MyWorld.Palette.Yellow)));
		let arm1 = new Spatial(world, [-e * 2, 2 * a - d / 2, 0], new Cube(world.gl, [e, d, e], World.HextoRGB(MyWorld.Palette.LightBlue)));
		let arm2 = new Spatial(world, [e * 2, 2 * a - d / 2, 0], new Cube(world.gl, [e, d, e], World.HextoRGB(MyWorld.Palette.LightBlue)));

		world.addChildren([leg1, leg2, body, head, arm1, arm2], this);
		this.angularVelocity = Math.PI / 4;
		this.collisionGroup = Player.CollisionID;
	}
	reset()
	{
		super.reset();
		this.onCollide.listeners.length = 0;
	}
}

class MediKit extends Spatial
{
	static get CollisionID()
	{
		return 1 << 5;
	}
	constructor(world, position)
	{
		super(world, position);
		this.size = [0.5, 0.5];
		let s = 0.5;
		let a = 1/5 * s;
		let b = 3/5 * s;
		let d = 2/5 * s;
		let hCross =  new Spatial(world, [0, s / 2, 0], new Cube(world.gl, [b, a, d], World.HextoRGB(MyWorld.Palette.White)));
		let vCross =  new Spatial(world, [0, s / 2, 0], new Cube(world.gl, [a, b, d], World.HextoRGB(MyWorld.Palette.White)));
		let box =  new Spatial(world, [0, s / 2, 0], new Cube(world.gl, [s, s, a], World.HextoRGB(MyWorld.Palette.Red)));
		world.addChildren([hCross, vCross, box], this);
		this.angularVelocity = Math.PI / 4;
		this.collisionGroup = Player.CollisionID;
		this.healthBoost = 0.25;
	}
	reset()
	{
		super.reset();
		this.onCollide.listeners.length = 0;
	}
}

class AbstractBullet extends Spatial
{
	
	constructor(world, position, color)
	{
		super(world, position, new Cube(world.gl, [0.25,0.25,0.5],
			color));
		this.size = [0.25, 0.5];    
		this.damage = 1 / 3;
	}
	reset()
	{
		super.reset();
		this.onCollide.listeners.length = 0;
	}
}

class PlayerBullet extends AbstractBullet
{
	static get CollisionID()
	{
		return 1 << 3;
	}
	constructor(world, position)
	{
		super(world, position, World.HextoRGB(MyWorld.Palette.Red));
		this.collisionGroup = MyWallSpatial.CollisionID + EnemySpatial.CollisionID;
	}
	
}

class EnemyBullet extends AbstractBullet
{
	static get CollisionID()
	{
		return 1 << 4;
	}
	constructor(world, position)
	{
		super(world, position, World.HextoRGB(MyWorld.Palette.Yellow));
		this.collisionGroup = MyWallSpatial.CollisionID + Player.CollisionID;
		this.damage = 1/6;
	}
}

class PlayerBulletPool extends Pool
{
	constructor()
	{
		super();
	}
	newObject(objectArgs)
	{
		return new PlayerBullet(objectArgs.world,
			objectArgs.position);
	}
}

class EnemyBulletPool extends Pool
{
	constructor()
	{
		super();
	}
	newObject(objectArgs)
	{
		return new EnemyBullet(objectArgs.world,
			objectArgs.position);
	}
}



class EnemySpatialPool extends Pool
{
	constructor()
	{
		super();
	}
	newObject(objectArgs)
	{
		return new EnemySpatial(objectArgs.world,
			objectArgs.position, objectArgs.end,
			objectArgs.mapFillGrid, objectArgs.moves,
			objectArgs.player);
	}
}

class PlayerPool extends Pool
{
	constructor()
	{
		super();
	}
	newObject(objectArgs)
	{
		return new Player(objectArgs.world,
			objectArgs.position);
	}
}

class HostagePool extends Pool
{
	constructor()
	{
		super();
	}
	newObject(objectArgs)
	{
		return new Hostage(objectArgs.world,
			objectArgs.position);
	}
}

class MediKitPool extends Pool
{
	constructor()
	{
		super();
	}
	newObject(objectArgs)
	{
		return new MediKit(objectArgs.world,
			objectArgs.position);
	}
}


class MyWallSpatial extends AbstractWallSpatial
{
	static get CollisionID()
	{
		return 1;
	}
	constructor(world, position)
	{
		super(world, position);
	}
	addCubes()
	{
		let mainCube = new Spatial(this.world, [0,1,0,], new Cube(this.world.gl, [1,2,1], World.HextoRGB(MyWorld.Palette.Orange)));
		let middleCube = new Spatial(this.world, [0,1,0,], new Cube(this.world.gl, [1.05,2/9,1.05], World.HextoRGB(MyWorld.Palette.White)));
		this.world.addChildren([mainCube], this);
	}
}

class MyFloorSpatial extends AbstractWallSpatial
{
	constructor(world, position)
	{
		super(world, position);
		
	}
	addCubes()
	{
		let floorTopCube = new Spatial(this.world, [0, 0.00625, 0], 
			new Cube(this.world.gl, [0.9,0.0125,0.9], World.HextoRGB(MyWorld.Palette.DarkRed)));
		this.world.addChildren([floorTopCube], this);
	}
}    

class MyCeilingSpatial extends AbstractWallSpatial
{
	constructor(world, position)
	{
		super(world, position);
		
	}
	addCubes()
	{
		let ceilingLightCube = new Spatial(this.world, [0, 1.9875, 0], 
			new Cube(this.world.gl, [0.2,0.02,1], World.HextoRGB(MyWorld.Palette.Yellow)));
		this.world.addChildren([ceilingLightCube], this);
	}
}    

let myWorld = new MyWorld(); 