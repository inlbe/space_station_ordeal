class World
{
	static HextoRGB(hex)
	{
		let rgb = [];
		let frac = 0xff
		rgb[0] = ((hex & 0xff0000) >> 16) / frac;
		rgb[1] = ((hex & 0xff00) >> 8) / frac;
		rgb[2] = (hex & 0xff) / frac;
		return rgb;
	}
	constructor()
	{
		this.events =
		{
			onKeyUp:null,
			onKeyDown:null
		};
		document.addEventListener('keydown', (event) =>
		{
			if(this.events.onKeyDown)
			{
				this.events.onKeyDown(event);
			}
		});
		document.addEventListener('keyup', (event) =>
		{
			if(this.events.onKeyUp)
			{
				this.events.onKeyUp(event);
			}
		});
		let vertexShaderSource = `attribute vec4 p;attribute vec3 n;uniform mat4 a;uniform mat4 b;varying vec3 c;void main(){gl_Position=a*p;c=mat3(b)*n;}`;
		let fragmentShaderSource = `precision mediump float;varying vec3 c;uniform vec4 e;void main(){vec3 f=normalize(c);float l=abs(f.x)*0.9+abs(f.y)+abs(f.z)*0.75;gl_FragColor=e;gl_FragColor.rgb*=l;}`;

		this.glCanvas = document.getElementById('glcanvas');
		this.canvas = document.getElementById("canvas");
		this.ctx = this.canvas.getContext("2d");
		this.glCanvas.style.background = "black"
		this.ctx.font = "32px Comic Sans MS";
		this.ctx.fillStyle = "red";
		this.ctx.textAlign = "left";
		this.gl = this.glCanvas.getContext("webgl");
		this.webglUtils = new WebGLUtils(this.gl);
		this.m4 = new M4();
		this.program = this.webglUtils.createProgramFromSources([vertexShaderSource, fragmentShaderSource]);
		this.hudItems = [];
		// Tell WebGL how to convert from clip space to pixels

		// look up where the vertex data needs to go.
		this.positionLocation = this.gl.getAttribLocation(this.program, "p");
		this.normalLocation = this.gl.getAttribLocation(this.program, "n");

		// lookup uniforms
		this.worldViewProjectionLocation = this.gl.getUniformLocation(this.program, "a");
		this.worldInverseTransposeLocation = this.gl.getUniformLocation(this.program, "b");
		this.colorLocation = this.gl.getUniformLocation(this.program, "e");

		this.zMin = 0.25;
		this.zMax = 20;
		this.zMaxSq = this.zMax * this.zMax;

	
		this.timers = [];
		this.children = [] //children spatials
		this.renderSpatials = [];
		let aspect = this.gl.canvas.width / this.gl.canvas.height;
		this.fieldOfView = Math.PI / 3;
		this.projectionMatrix = this.m4.perspective(this.fieldOfView, aspect, this.zMin, this.zMax);
		this.camTargetDis = Math.pow(2, 32);
		this.camera = new Camera(this, [0, 0, 0], [0, 0, 0]);
		this.tileSize = 1;

		// Turn on the position attribute
		this.gl.enableVertexAttribArray(this.positionLocation);

		// Turn on the normal attribute
		this.gl.enableVertexAttribArray(this.normalLocation);

		this.cubeNormalBuffer = this.gl.createBuffer();
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.cubeNormalBuffer);
		this.gl.bufferData(this.gl.ARRAY_BUFFER, Cube.VertexNormals,
			this.gl.STATIC_DRAW);

		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.cubeNormalBuffer);

		// Tell the position attribute how to get data out of positionBuffer (ARRAY_BUFFER)
		let size = 3;          // 3 components per iteration
		let type = this.gl.FLOAT;   // the data is 32bit floats
		let normalize = false; // don't normalize the data
		let stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
		let offset = 0;        // start at the beginning of the buffer

		this.gl.vertexAttribPointer(
			this.normalLocation, size, type, normalize, stride, offset);

		this.cubeIndexBuffer = this.gl.createBuffer();
		this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.cubeIndexBuffer);
		
		// Now send the element array to GL

		this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER,
			new Uint16Array(Cube.Indices), this.gl.STATIC_DRAW);

		this.webglUtils.resizeCanvasToDisplaySize(this.gl.canvas);

		// Tell WebGL how to convert from clip space to pixels
		this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);

		this.gl.enable(this.gl.CULL_FACE);
		this.gl.enable(this.gl.DEPTH_TEST);
		this.gl.useProgram(this.program);

		this.timeRef = 0;
		this.collisionGrid = null;
		this.timers = [];
		this.tilemap = null;
		this.renderActivated = true;
		this.reStarted = true;
		this.maxFrameTime = 0.2;
		this.requestID = requestAnimationFrame(this.render.bind(this));
	}
	render(time)
	{
		let deltaTimeSec = (time - this.timeRef) / 1000;
		this.timeRef = time;
		if(deltaTimeSec > this.maxFrameTime)
		{
		  deltaTimeSec = this.maxFrameTime;
		}
		this.timers.forEach((timer) =>
		{
			timer.update(deltaTimeSec);
		});

		if(this.tilemap)
		{
			this.tilemap.doTileRenderSpatials();
		}

		if(this.collisionGrid)
		{
			this.collisionGrid.collidingSpatials.forEach((spatial) =>
			{
				spatial.collidingX = false;
				spatial.collidingY = false;
			});
			this.collisionGrid.collidingSpatials.length = 0;
			this.collisionGrid.update();
			this.collisionGrid.checkCollisions(deltaTimeSec);
		}

		// Tell WebGL how to convert from clip space to pixels

		// Clear the canvas AND the depth buffer.
		this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

		let viewProjectionMatrix = this.m4.multiply(this.projectionMatrix, this.camera.viewMatrix);

		this.renderSpatials.forEach((spatial) =>
		{
			if(!spatial.fixed && spatial.active)
			{
				if(!spatial.collidingX)
				{
					spatial.position[0] += spatial.speed.x * deltaTimeSec;
				}
				if(!spatial.collidingY)
				{
					spatial.position[2] += spatial.speed.z * deltaTimeSec;
				}
				this.calcWorldPos(spatial);
				spatial.rotation += spatial.angularVelocity * deltaTimeSec;
				this.calcMatrix(spatial);
			}
			
			if(spatial.cube && (spatial.alwaysDraw || MathsFunctions.DisSq(this.camera.position, spatial.worldPosition)) < this.zMaxSq /*&& MathsFunctions.DisSq(this.camera.position, spatial.worldPosition) < this.zMaxSq*/)
			{
				// Turn on the position attribute

				// Bind the position buffer.
				this.gl.bindBuffer(this.gl.ARRAY_BUFFER, spatial.cube.positionBuffer);

				// Tell the position attribute how to get data out of positionBuffer (ARRAY_BUFFER)
				let size = 3;          // 3 components per iteration
				let type = this.gl.FLOAT;   // the data is 32bit floats
				let normalize = false; // don't normalize the data
				let stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
				let offset = 0;        // start at the beginning of the buffer
				this.gl.vertexAttribPointer(
					this.positionLocation, size, type, normalize, stride, offset);

				// Multiply the matrices.
				let worldViewProjectionMatrix = this.m4.multiply(viewProjectionMatrix, spatial.matrix);
				let worldInverseMatrix = this.m4.inverse(spatial.matrix);
				let worldInverseTransposeMatrix = this.m4.transpose(worldInverseMatrix);

				// Set the matrices
				this.gl.uniformMatrix4fv(this.worldViewProjectionLocation, false, worldViewProjectionMatrix);
				this.gl.uniformMatrix4fv(this.worldInverseTransposeLocation, false, worldInverseTransposeMatrix);

				// Set the color to use
				this.gl.uniform4fv(this.colorLocation, [...spatial.cube.color, 1]);

				// Draw the geometry.

				let vertexCount = 36;
				type = this.gl.UNSIGNED_SHORT;
				this.gl.drawElements(this.gl.TRIANGLES, vertexCount, type, offset);
			}

			
			
		});

		this.renderSpatials.forEach((spatial) =>
		{
			if(spatial.active)
			{
				spatial.update(deltaTimeSec);
			}
		});

		this.update(deltaTimeSec);

		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		
		let hudText = "";
		this.hudItems.forEach((item) =>
		{
			hudText += item;
		})
		this.ctx.fillText(hudText, 0, this.canvas.height/2);
		this.requestID = requestAnimationFrame(this.render.bind(this));
	}
	addChild(spatial, parent = this, calculateRenderSpatials = true)
	{
		if(spatial.parent)
		{
			this.removeChild(spatial);
		}
		parent.children.push(spatial);
		spatial.parent = parent;
		
		if(calculateRenderSpatials)
		{
			this.calcRenderSpatials();
		}
		spatial.initGridPos();
		
		return spatial;
	}
	addChildren(children, parent)
	{
		children.forEach((child) =>
		{
			this.addChild(child, parent, false);
		});
		this.calcRenderSpatials();
	}
	removeChild(spatial, calculateRenderSpatials = true)
	{
		// remove spatial from world
		spatial.parent.children.splice(spatial.parent.children.findIndex((refSpatial) =>
		{
			return refSpatial === spatial;
		}), 1);
		spatial.parent = null;
		if(calculateRenderSpatials)
		{
			this.calcRenderSpatials();
		}
		//return spatial;
	}
	removeChildren(children)
	{
		children.forEach((child) =>
		{
			this.removeChild(child, false);
		});
		this.calcRenderSpatials();
	}
	removeAllChildren(parent = this)
	{
		while(parent.children.length > 0)
		{
			this.removeChild(parent.children[0], false);
		}

		this.calcRenderSpatials();
		//return spatial;
	}
	calcWorldPos(spatial)
	{
		spatial.worldPosition = [...spatial.position];
		let currentParent = spatial.parent;
		if(currentParent === this)
		{
			spatial.worldPosition = [...spatial.position];
		}
		while(currentParent !== this)
		{
			if(!currentParent)
			{
				spatial.worldPosition = [0, 0, 0];
				break;
			}
			spatial.worldPosition[0] += currentParent.position[0];
			spatial.worldPosition[1] += currentParent.position[1];
			spatial.worldPosition[2] += currentParent.position[2];
			currentParent = currentParent.parent;
		}
	}
	calcMatrix(spatial)
	{
		if(spatial.parent !== this)
		{
			spatial.matrix = spatial.parent.matrix;
			spatial.matrix = this.m4.translate(spatial.matrix,
				spatial.position[0],
				spatial.position[1],
				spatial.position[2]);
			spatial.matrix = this.m4.yRotate(spatial.matrix, spatial.rotation);
		}
		else
		{
			spatial.matrix = this.m4.identity();
			spatial.matrix = this.m4.translate(spatial.matrix,
				spatial.worldPosition[0],
				spatial.worldPosition[1],
				spatial.worldPosition[2]);    
			spatial.matrix = this.m4.yRotate(spatial.matrix, spatial.rotation);
		}
	}
	calcRenderSpatials()
	{
		//get visible spatials
		let finished = null;
		this.renderSpatials.length = 0;
		let tempSpatials = new Array();
		let currentSpatial = null;
		for(let i = 0; i < this.children.length; i++)
		{
			if(this.children[i].visible)
			{
				currentSpatial = this.children[i];
				tempSpatials.push(currentSpatial);
				finished = false;
			}
			else
			{
				finished = true;
			}
			while(!finished)
			{
				let renderSpatialsDone = true;
				for(let j = currentSpatial.renderSearchIndex; j < currentSpatial.children.length; j++)
				{   
					if(currentSpatial.children[j].visible)
					{
						currentSpatial.renderSearchIndex = j + 1;
						//move down
						currentSpatial = currentSpatial.children[j];
						tempSpatials.push(currentSpatial);
						renderSpatialsDone = false;
						break;
					}
				}
				currentSpatial.renderSearchIndex = 0;
				if(renderSpatialsDone)
				{
					// move up
					if(currentSpatial.parent !== this)
					{
						currentSpatial = currentSpatial.parent;
					}
					else
					{
						finished = true;
						this.renderSpatials = this.renderSpatials.concat(tempSpatials);
						tempSpatials.length = 0;
					}
				}
			}
		}
		this.renderSpatials.forEach((spatial) =>
		{
			this.calcWorldPos(spatial);
			this.calcMatrix(spatial);
		});
	}
	update(deltaTimeSec)
	{

	}
	stop()
	{
		this.renderActivated = false;
	}
	start()
	{
		this.renderActivated = true;
		this.reStarted = true;
	}
}

class Point
{
	constructor(x = 0, z = 0)
	{
		this.x = x;
		this.z = z;
	}
	compare(another)
	{
		if(another)
		{
			if(another.x === this.x && another.z === this.z)
			{
				return true;
			}
			else
			{
				return false;
			}
		}
		else
		{
			return false;
		}
	}
	setTo(another)
	{
		this.x = another.x;
		this.z = another.z;
		return this;
	}
	add(another)
	{
		if(another)
		{
			this.x += another.x;
			this.z += another.z;
		}
	}
	addNew(another)
	{
		//add and return a new point
		return new Point(this.x + another.x, this.z + another.z);
	}
}

class MyGrid
{
	constructor(xDim, zDim, fillWith = null)
	{
		let fill = null;
		if(typeof fillWith === 'object')
		{
			fill = ((value, grid, x) =>
			{
			grid[x].push(JSON.parse(JSON.stringify(value)));
			});
		}
		else
		{
			fill = ((value, grid, x) =>
			{
				grid[x].push(value);
			});
		}
		this.grid = [];
		this.xDim = xDim;
		this.zDim = zDim;
		for(let x = 0; x < xDim; x ++)
		{
			let row = [];
			this.grid.push(row);
			for(let y = 0; y < zDim; y++)
			{
				fill(fillWith, this.grid, x);
			}
		}
		this.length = xDim * zDim;
		this.all = this._getAll();
	}
	getAll()
	{
		return this.all;
	}
	_getAll()
	{
		let all = [];
		for(let i = 0; i < this.length; i++)
		{
			all.push(this._get(i));
		}
		return all;
	}
	_get(n)
	{
		let y = Math.floor(n / this.xDim);
		let x = n - (y * this.xDim);
		return {obj: this.grid[x][y], x: x, y: y};
	}
	setAll(value)
	{
		this.getAll().forEach((cell) =>
		{
			this.grid[cell.x][cell.z] = value;
		});
	}
}

class CollisionGrid extends MyGrid
{
	constructor(world, xDim, zDim)
	{
		super(xDim, zDim, {spatials: []});
		this.world = world;
		this.notFixedSpatials = [];
		this.collidingSpatials = [];
	}
	addSpatial(spatial)
	{
		if(!spatial.fixed)
		{
			this.notFixedSpatials.push(spatial);
		}
			let gridPos = this._calculateSpatialGridPos(spatial);
		if(!spatial.gridPos.compare(gridPos))
		{
			spatial.gridPos.setTo(gridPos);
			spatial.onGridPosChanged.dispatch();
		}
		this.grid[gridPos.x][gridPos.z].spatials.push(spatial);
		return spatial;
	}
	addSpatials(spatials)
	{
		spatials.forEach((spatial) =>
		{
			this.addSpatial(spatial);
		});
	}
	removeSpatial(spatial)
	{
		this.getAll().some((cell) =>
		{
			return (cell.obj.spatials.some((arraySpatial, index) =>
		{
		if(arraySpatial === spatial)
		{
			cell.obj.spatials.splice(index, 1);
			return true;
		}
		}))
		});
		this.notFixedSpatials.splice(this.notFixedSpatials.findIndex((item) =>
		{
			return item === spatial;
		}), 1);
	}
	removeSpatials(spatials)
	{
		spatials.forEach((spatial) =>
		{
			this.removeSpatial(spatial);
		});
	}
	update()
	{
		let toMove = [];

		this.notFixedSpatials.forEach((spatial) =>
		{
			if(spatial.active && spatial.speed.x || spatial.speed.z)
			{
				let oldGridPos = new Point(spatial.gridPos.x, spatial.gridPos.z);
				let newGridPos = this._calculateSpatialGridPos(spatial);

				if(!newGridPos.compare(oldGridPos))
				{
					toMove.push({spatial: spatial, oldGridPos: oldGridPos,
					newGridPos: newGridPos});
				}
			}
		});

		//remove old grid pos
		toMove.forEach((obj) =>
		{
			let index = this.grid[obj.oldGridPos.x][obj.oldGridPos.z].spatials.findIndex((spatial) =>
			{
				return spatial === obj.spatial;
			});


			this.grid[obj.oldGridPos.x][obj.oldGridPos.z].spatials.splice(index, 1);
		});
		//add new grid pos
		toMove.forEach((obj) =>
		{
			this.grid[obj.newGridPos.x][obj.newGridPos.z].spatials.push(obj.spatial);
			obj.spatial.setGridPos(obj.newGridPos);
			obj.spatial.onGridPosChanged.dispatch();
		});

	}
	checkCollisions(deltaTimeSec)
	{
		this.notFixedSpatials.forEach((spatial) =>
		{
			this._collidesWith(spatial, spatial.gridPos.x, spatial.gridPos.z, false, deltaTimeSec);
		});

	}
	collisionTest(spatial)
	{
		return this._collidesWith(spatial, Math.floor(spatial.position[0] / this.world.tileSize),
			Math.floor(spatial.position[2] / this.world.tileSize), true);
	}
	_collidesWith(spatial, gridX, gridY,testing = false, deltaTimeSec = 0)
	{
		let calcXCentre = ((spatial, next) =>
		{
			let add = 0;
			if(next && !spatial.collidingX)
			{
				add = spatial.speed.x * deltaTimeSec;
			}
			return spatial.position[0] + add;
		});
		let calcYCentre = ((spatial, next) =>
		{
			let add = 0;
			if(next && !spatial.collidingY)
			{
				add = spatial.speed.z * deltaTimeSec;
			}
			return spatial.position[2] + add;
		});

		let collided = false;
		let checkSpatialCentres = [];
		let spatialCentres = [];
		let colDisX = 0;
		let colDisY = 0;
		let colWidth = 0;
		let colHeight = 0;
		spatialCentres.push(new Point(calcXCentre(spatial, true),calcYCentre(spatial, false)));
		spatialCentres.push(new Point(calcXCentre(spatial, false),calcYCentre(spatial, true)));

		let startX = gridX - 3;
		if(startX < 0)
		{
			startX = 0;
		}
		let endX = gridX + 3;
		if(endX > this.xDim)
		{
			endX = this.xDim;
		}
		let startY = gridY - 3;
		if(startY < 0)
		{
			startY = 0;
		}
		let endY = gridY + 3;
		if(endY > this.zDim)
		{
			endY = this.zDim;
		}

		for(let x = startX; x < endX; x++)
		{
			for(let y = startY; y < endY; y++)
			{
				this.grid[x][y].spatials.forEach((checkSpatial) =>
				{
					if(checkSpatial !== spatial &&
					(checkSpatial.constructor.CollisionID & spatial.collisionGroup))
					{
						checkSpatialCentres.length = 0;
						checkSpatialCentres.push(new Point(calcXCentre(checkSpatial, true),calcYCentre(checkSpatial, false)));
						checkSpatialCentres.push(new Point(calcXCentre(checkSpatial, false),calcYCentre(checkSpatial, true)));
						collided = false;
						for(let i = 0; i < 2; i++)
						{
							colDisX = checkSpatialCentres[i].x - spatialCentres[i].x;
							colDisY = checkSpatialCentres[i].z - spatialCentres[i].z;
							colWidth = (checkSpatial.size[0] / 2) + (spatial.size[0] / 2);
							colHeight = (checkSpatial.size[1] / 2) + (spatial.size[1] / 2);
							if(Math.abs(colDisX) < colWidth && Math.abs(colDisY) < colHeight)
							{
								collided = true;
								if(!testing)
								{
									if(i === 0)
									{
										if(spatial.solid)
										{
											checkSpatial.collidingX = true;
											spatial.collidingX = true;
											this.collidingSpatials.push(checkSpatial, spatial);
										}
									}
									else
									{
										if(spatial.solid)
										{
											checkSpatial.collidingY = true;
											spatial.collidingY = true;
											this.collidingSpatials.push(checkSpatial, spatial);
										}
									}
								}
								else
								{
									y = endY;
									x = endX;
								}
							}

						}
						if(!testing && collided)
						{
							spatial.onCollide.dispatch(spatial, checkSpatial);
							checkSpatial.onCollide.dispatch(checkSpatial, spatial);
						}
					}
				});
			}
		}
		return collided;
	}
	_calculateSpatialGridPos(spatial)
	{
		let gridPos = new Point(spatial.gridPos.x, spatial.gridPos.z);

		if(!spatial.speed.x)
		{
			gridPos.x = Math.round(spatial.position[0] / this.world.tileSize);
		}

		else if(spatial.collidingX && spatial.speed.x)
		{
			gridPos.x = Math.round(spatial.position[0] / this.world.tileSize);
		}

		else if(spatial.speed.x < 0 && spatial.position[0] <= (gridPos.x - 1) * this.world.tileSize)
		{
			gridPos.x --;
		}
		else if(spatial.speed.x > 0 && spatial.position[0] >= (gridPos.x + 1) * this.world.tileSize)
		{
			gridPos.x ++;
		}
		if(!spatial.speed.z)
		{
			gridPos.z = Math.round(spatial.position[2] / this.world.tileSize);
		}

		else if(spatial.collidingY && spatial.speed.z)
		{
			gridPos.z = Math.round(spatial.position[2] / this.world.tileSize);
		}

		else if(spatial.speed.z < 0 && spatial.position[2] <= (gridPos.z - 1) * this.world.tileSize)
		{
			gridPos.z --;
		}
		else if(spatial.speed.z > 0 && spatial.position[2] >= (gridPos.z + 1) * this.world.tileSize)
		{
			gridPos.z ++;
		}
		return gridPos;
	}
	clear()
	{
		this.getAll().forEach((cell) =>
		{
			cell.obj.spatials.length = 0;
		});
	}
}


class Cube
{
	static get VertexNormals()
	{
		let vertexNormals = new Float32Array(
		[
			// Front
			0,  0,  1,
			0,  0,  1,
			0,  0,  1,
			0,  0,  1,

			// Back
			0,  0, -1,
			0,  0, -1,
			0,  0, -1,
			0,  0, -1,

			// Top
			0,  1,  0,
			0,  1,  0,
			0,  1,  0,
			0,  1,  0,

			// Bottom
			0, -1,  0,
			0, -1,  0,
			0, -1,  0,
			0, -1,  0,

			// Right
			1,  0,  0,
			1,  0,  0,
			1,  0,  0,
			1,  0,  0,

			// Left
			-1,  0,  0,
			-1,  0,  0,
			-1,  0,  0,
			-1,  0,  0
		]);
		return vertexNormals;
	} 
	static get Indices()
	{
		let indices = 
		[
			0,  1,  2,      0,  2,  3,    // front
			4,  5,  6,      4,  6,  7,    // back
			8,  9,  10,     8,  10, 11,   // top
			12, 13, 14,     12, 14, 15,   // bottom
			16, 17, 18,     16, 18, 19,   // right
			20, 21, 22,     20, 22, 23,   // left
		];
		return indices;
	}
	constructor(gl, size = [1, 1, 1], color = [0, 1, 0])
	{
		this.size = size;
		this.color = color;
		this.positionBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
		let half = size / 2;

		let halfSize = [size[0] / 2, size[1] / 2, size[2] / 2];

		let positions = 
		new Float32Array
		([
			-halfSize[0], -halfSize[1],  halfSize[2],
			halfSize[0], -halfSize[1],  halfSize[2],
			halfSize[0],  halfSize[1],  halfSize[2],
		   -halfSize[0],  halfSize[1],  halfSize[2],
	   
		   // Back face
		   -halfSize[0], -halfSize[1], -halfSize[2],
		   -halfSize[0],  halfSize[1], -halfSize[2],
			halfSize[0],  halfSize[1], -halfSize[2],
			halfSize[0], -halfSize[1], -halfSize[2],
	   
		   // Top face
		   -halfSize[0],  halfSize[1], -halfSize[2],
		   -halfSize[0],  halfSize[1],  halfSize[2],
			halfSize[0],  halfSize[1],  halfSize[2],
			halfSize[0],  halfSize[1], -halfSize[2],
	   
		   // Bottom face
		   -halfSize[0], -halfSize[1], -halfSize[2],
			halfSize[0], -halfSize[1], -halfSize[2],
			halfSize[0], -halfSize[1],  halfSize[2],
		   -halfSize[0], -halfSize[1],  halfSize[2],
	   
		   // Right face
			halfSize[0], -halfSize[1], -halfSize[2],
			halfSize[0],  halfSize[1], -halfSize[2],
			halfSize[0],  halfSize[1],  halfSize[2],
			halfSize[0], -halfSize[1],  halfSize[2],
	   
		   // Left face
		   -halfSize[0], -halfSize[1], -halfSize[2],
		   -halfSize[0], -halfSize[1],  halfSize[2],
		   -halfSize[0],  halfSize[1],  halfSize[2],
		   -halfSize[0],  halfSize[1], -halfSize[2],
		]);

		// Now pass the list of positions into WebGL to build the
		// shape. We do this by creating a Float32Array from the
		// JavaScript array, then use it to fill the current buffer.

		gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
	}
}


class Spatial
{
	static get CollisionID()
	{
		return 0;
	}
	constructor(world, position = [0, 0, 0], cube = null)
	{
		this.world = world;
		this.position = position;
		this.parent = null;
		this.cube = cube;
		this.worldPosition = [0, 0, 0];
		this.visible = true;
		this.children = [];
		this.renderSearchIndex = 0;
		this.rotation = 0; //only able to rotate on y axis for simplicity
		this.angularVelocity = 0;
		this.matrix = null;
		this.fixed = false;
		this.solid = true;
		this.speed = new Point(0, 0);
		this.gridPos = new Point(0, 0);
		this.collidingX = false;
		this.collidingY = false;
		this.collisionGroup = null;
		this.onCollide = new Signal(this);
		this.onGridPosChanged = new Signal(this);
		this.active = true;
		this.size = [1, 1];
		this.alwaysDraw = false; //always draw regardless of distance from camera 
		this.health = 1;
	}
	setGridPos(newGridPos)
	{
		this.gridPos.setTo(newGridPos);
	}
	initGridPos()
	{
		this.setGridPos(new Point(Math.round(this.worldPosition[0] / this.world.tileSize),
			Math.round(this.worldPosition[2] / this.world.tileSize)));
	}
	reset()
	{
		//reset object when put into pool
		this.position = [0,0,0]
		this.speed.x = 0;
		this.speed.z = 0;
		this.rotation = 0;
		this.health = 1;
	}
	set(objectArgs)
	{
		//set obtained objects
		this.position = objectArgs.position || [0, 0, 0];
		this.active = true;
	}
	setVisible(visible, recalculateRenderSpatials = false)
	{
		this.visible = visible;
		if(recalculateRenderSpatials)
		{
			this.world.calcRenderSpatials();
		}
	}
	update(deltaTimeSec)
	{

	}
}

class Camera
{
	constructor(world, position, target, up = [0, 1, 0])
	{
		this.world = world;
		this.target = target;
		this.position = position;
		this.up = up;
		this.cameraMatrix = null
		this.viewMatrix = null; 
		this._calcMatrixes();
	}    
	_calcMatrixes()
	{
		this.cameraMatrix = this.world.m4.lookAt(this.position, this.target, this.up);
		this.viewMatrix = this.world.m4.inverse(this.cameraMatrix);
	}
	setProperties(position = this.position, target = this.target, up = this.up)
	{
		this.target = target;
		this.position = position;
		this.up = up;
		this._calcMatrixes();
	}
}

class Tilemap extends Spatial
{
	constructor(world, position, wallSpatialClass, floorSpatialClass, refSpatial, mapFillGrid)
	{
		super(world, position);
		this.wallSpatials = [];
		this.floorSpatials = [];
		this.refSpatial = refSpatial;
		this.wallSpatialPool = new WallSpatialPool(wallSpatialClass);
		this.floorSpatialPool = new WallSpatialPool(floorSpatialClass);

		this.mapFillGrid = mapFillGrid;
		this.collisionGridWallSpatials = [];

		this.visibleTiles = [];

		this.tilemapGrid = new MyGrid(mapFillGrid.xDim, mapFillGrid.zDim, {spatials : []})

	}
	createTileSpatials()
	{

		for(let y = 0; y < this.mapFillGrid.zDim; y++)
		{
			for(let x = 0; x < this.mapFillGrid.xDim; x++)
			{
				if(this.mapFillGrid.grid[x][y].filled)
				{
					let wallSpatial = this.world.addChild(this.wallSpatialPool.obtain({world: this.world, position: [x,0,y]}), this)
					this.wallSpatials.push(wallSpatial);
					this.tilemapGrid.grid[x][y].spatials.push(wallSpatial);
					wallSpatial.setVisible(false, false);
				}
				else
				{
					let floorSpatial = this.world.addChild(this.floorSpatialPool.obtain({world: this.world, position: [x,0,y]}), this);
					this.floorSpatials.push(floorSpatial);
					this.tilemapGrid.grid[x][y].spatials.push(floorSpatial);
					floorSpatial.setVisible(false, false);
				}
			}
		}
		this.world.calcRenderSpatials();
		if(this.world.collisionGrid)
		{
			this.wallSpatials.forEach((wallSpatial) =>
			{
				this.world.collisionGrid.addSpatial(wallSpatial)
			});
		}
	}
	doTileRenderSpatials()
	{
		let zMax = this.world.zMax;

		this.visibleTiles.forEach((spatial) =>
		{
			spatial.setVisible(false, false);
		});
		this.visibleTiles.length = 0;

		let xMin = this.refSpatial.gridPos.x - zMax;
		if(xMin < 0)
		{
			xMin = 0;
		}
		let xMax = this.refSpatial.gridPos.x + zMax;
		if(xMax >= this.mapFillGrid.xDim)
		{
			xMax = this.mapFillGrid.xDim;
		}

		let yMin = this.refSpatial.gridPos.z - zMax;
		if(yMin < 0)
		{
			yMin = 0;
		}
		let yMax = this.refSpatial.gridPos.z + zMax;
		if(yMax >= this.mapFillGrid.zDim)
		{
			yMax = this.mapFillGrid.zDim;
		}
		let camAng = MathsFunctions.NormalizeAngle(Math.atan2(this.world.camera.target[0], this.world.camera.target[2]));

		for(let x = xMin; x < xMax; x++)
		{
			for(let y = yMin; y < yMax; y++)
			{
				let ang = MathsFunctions.NormalizeAngle(Math.atan2(x - this.refSpatial.gridPos.x, y - this.refSpatial.gridPos.z));
				let relAng = MathsFunctions.NormalizeAngle(ang - camAng);
				if(relAng <= Math.PI * 0.5 || relAng >= Math.PI * 1.5)
				{
					this.tilemapGrid.grid[x][y].spatials.forEach((spatial) =>
					{
						spatial.setVisible(true, false);
						this.visibleTiles.push(spatial);
					});
				}
			}
		}
		this.world.calcRenderSpatials();
	}
	clearTileSpatials()
	{
		if(this.world.collisionGrid)
		{
			this.world.collisionGrid.removeSpatials(this.wallSpatials);
		}
		this.visibleTiles.forEach((spatial) =>
		{
			spatial.setVisible(false, false);
		});
		this.wallSpatials.forEach((wallSpatial) =>
		{
			this.wallSpatialPool.free(wallSpatial);
		});
		this.wallSpatials.length = 0;
		this.floorSpatials.forEach((floorSpatial) =>
		{
			this.floorSpatialPool.free(floorSpatial);
		});
		this.floorSpatials.length = 0;
		this.world.removeAllChildren(this);
		
	}
	reset()
	{
		super.reset();
		this.clearTileSpatials();
	}
	set(objectArgs)
	{
		super.set(objectArgs);
		this.refSpatial = objectArgs.refSpatial;
		this.mapFillGrid = objectArgs.mapFillGrid;
	}
	setWallSpatialCollisionGroups(collisionGroup)
	{
		this.collisionGridWallSpatials.forEach((spatial) =>
		{
			spatial.collisionGroup = collisionGroup
		});
	}
}

class AbstractWallSpatial extends Spatial
{
	
	constructor(world, position)
	{
		super(world, position);
		this.fixed = true;
	}
	addCubes(cubes)
	{
	}
}

class Pool
{
	//object pool class
	constructor(maxSize = 1500)
	{
		this._pool = new Array();
		this.maxSize = maxSize;
	}
	free(object)
	{
		object.reset();
		if(this._pool.length < this.maxSize)
		{
			this._pool.push(object);
		}
	}
	freeAll(objects)
	{
		for(let i = 0; i < objects.length; i++)
		{
			this.free(objects[i]);
		}
	}
	obtain(objectArgs)
	{
		let returnObj = null;
		if(this._pool.length > 0)
		{
			returnObj = this._pool[this._pool.length - 1];
			returnObj.set(objectArgs);
			this._pool.splice(this._pool.length - 1, 1);
		}
		else
		{
			//create new object
			returnObj = this.newObject(objectArgs);
		}
		return returnObj;
	}
	newObject(objectArgs)
	{
		//override me
		return {};
	}
}

class TilemapPool extends Pool
{
	constructor()
	{
		super();
	}
	newObject(objectArgs)
	{
		return new Tilemap(
			objectArgs.world,
			objectArgs.position,
			objectArgs.wallSpatialClass,
			objectArgs.floorSpatialClass,
			objectArgs.refSpatial,
			objectArgs.mapFillGrid)
	}
}

class WallSpatialPool extends Pool
{
	constructor(wallSpatialClass)
	{
		super();
		this.wallSpatialClass = wallSpatialClass;
	}
	newObject(objectArgs)
	{
		let wallSpatial = new this.wallSpatialClass(objectArgs.world, objectArgs.position);
		wallSpatial.addCubes();
		return wallSpatial;
	}
}

class Timer
{
	constructor(endTime)
	{
		this.endTime = endTime;
		this.timer = 0;
		this.complete = false;
		this.onComplete = null;
		this.active = false;
	}
	update(deltaTimeSec)
	{
		if(!this.complete && this.active)
		{
			this.timer += deltaTimeSec;
			if(this.timer > this.endTime)
			{
				this.complete = true;
				if(this.onComplete)
				{
					this.onComplete(this);
				}
			}
		}
	}
	reset(active)
	{
		this.active = active;
		this.complete = false;
		this.timer = 0;
	}
}

class Signal
{
	constructor(spatial)
	{
		this.spatial = spatial;
		this.listeners = [];
	}
	dispatch(...args)
	{
		this.listeners.forEach((listener) =>
		{
			let currentParent = this.spatial;
			while(currentParent)
			{
				if(listener.listeningSpatial === currentParent)
				{
					listener.callback(...args);
					if(listener.terminate)
					{
					break;
					}
				}
				currentParent.parent ? currentParent = currentParent.parent : currentParent = null;
			}
		});
	}
	addListener(listeningSpatial, callback, terminate = false)
	{
		let listener = new Listener(listeningSpatial, callback, terminate);
		this.listeners.push(listener);
		return listener;
	}
	removeListener(listener)
	{
		this.listeners.splice(this.listeners.findIndex((item) =>
		{
			return item === listener;
		}), 1);
	}
}

class Listener
{
	constructor(listeningSpatial, callback,  terminate = false)
	{
		this.listeningSpatial = listeningSpatial;
		this.callback = callback;
		this.terminate = terminate;
	}
}

class FillGrid
{
	constructor(xDim, zDim)
	{
		this.grid = [];
		this.xDim = xDim;
		this.zDim = zDim;
		this.directionObj = Direction.DIRECTION_OBJ;
		for(let x = 0; x < xDim; x++)
		{
			let col = [];
			this.grid.push(col);
			for(let y = 0; y < zDim; y++)
			{
				col.push({filled: false, joinable: false,
				enclosed:
				[
					true,
					true,
					true,
					true
				]});
			}
		}
	}
	forEach(callback)
	{
		for(let x = 0; x < this.xDim; x++)
		{
			for(let y = 0; y < this.zDim; y++)
			{
				callback(this.grid[x][y], x, y);
			}
		}
	}
}

class BoolGrid
{
	constructor(xDim, zDim)
	{
		this.grid = [];
		this.xDim = xDim;
		this.zDim = zDim;
		for(let x = 0; x < xDim; x++)
		{
			let col = [];
			this.grid.push(col);
			for(let y = 0; y < zDim; y++)
			{
				col.push(false);
			}
		}
	}
	resetGrid()
	{
		this.grid.forEach((col) =>
		{
			for(let i = 0; i < col.length; i++)
			{
				col[i] = false;
			}
		});
	}
}

class Direction
{
	static get Directions()
	{
		return {E: 1, N: 2, W: 3, S: 4, NONE: 5};
	}
	constructor()
	{
		this.directions = [];
		this.directions.push({id:Direction.Directions.E, point: new Point(1, 0), blockedBy : []},
		{id:Direction.Directions.N, point: new Point(0, -1), blockedBy: []},
		{id:Direction.Directions.W, point: new Point(-1, 0), blockedBy: []},
		{id:Direction.Directions.S, point: new Point(0, 1), blockedBy: []},
		{id:Direction.Directions.NONE, point: new Point(0, 0), blockedBy: []});
	}
	static get DIRECTION_OBJ()
	{
		return new Direction();
	}
}

class MathsFunctions
{
	static RandomInt(min, max)
	{
		min = Math.ceil(min);
		max = Math.floor(max);
		return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
	}
	static RandomIntInclusive(min, max)
	{
		min = Math.ceil(min);
		max = Math.floor(max);
		return Math.floor(Math.random() * (max - min + 1)) + min; //The maximum is inclusive and the minimum is inclusive
	}
	static RandomFloat(min, max)
	{
		return Math.random() * (max - min) + min;
	}
	static RandomPick(array)
	{
		return array[MathsFunctions.RandomPickIndex(array)];
	}
	static RandomPickIndex(array)
	{
		return MathsFunctions.RandomInt(0, array.length);
	}
	static DisSq(pos1, pos2)
	{
		//distance squared on x,z axis
		return Math.pow(pos2[0] - pos1[0], 2) + Math.pow(pos2[2] - pos1[2], 2);
	}
	static Dis(pos1, pos2)
	{
		//distance
		return Math.sqrt(MathsFunctions.DisSq(pos1, pos2));
	}
	static NormalizeAngle(ang)
	{
		if(ang < 0)
		{
			ang = (ang % (Math.PI * 2)) + Math.PI * 2;
		}
		else if(ang > Math.PI * 2)
		{
			ang = (ang % (Math.PI * 2));
		} 
		return ang;
	}
	static ArrayMaxIndex(array, callback)
	{
		let currentMax = Number.MIN_SAFE_INTEGER;
		let maxIndex = 0;
		array.forEach((element, index) =>
		{
			let val = callback(element);
			if(val < currentMax)
			{
				currentMax = val;
				maxIndex = index;
			}
		});
		return maxIndex;
	}
}