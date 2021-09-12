class MazeCreator
{
	constructor(gridSquarePool, gridPathPool, gridPathFinderPool)
	{
		this.gridSquarePool = gridSquarePool;
		this.gridPathPool = gridPathPool;
		this.gridPathFinderPool = gridPathFinderPool;
		this.fillGrid = null;
		this.chamberSize = 3;
		this.chamberEntrances = [];
	}
	_doChamberPoints(chambers, gridPoints)
	{
		let roundHalfChamberSize = Math.round(this.chamberSize / 2);
		let floorHalfChamberSize = Math.floor(this.chamberSize / 2);
		let chamberSpacing = 2;
		let possibleChamberPoints = [];
		let chamberPoints = [];

		for(let x = (chamberSpacing - 1) + roundHalfChamberSize; x < this.fillGrid.xDim - chamberSpacing - roundHalfChamberSize; x++)
		{
			for(let y = (chamberSpacing - 1) + roundHalfChamberSize; y < this.fillGrid.zDim - chamberSpacing - roundHalfChamberSize; y++)
			{
				possibleChamberPoints.push(new Point(x, y));
			}
		}
		let addChamberPoint = (point) =>
		{
			chamberPoints.push(new Point(point.x, point.z));
			for(let x = point.x - floorHalfChamberSize; x < point.x + floorHalfChamberSize; x++)
			{
				for(let y = point.z - floorHalfChamberSize; y < point.z + floorHalfChamberSize; y++)
				{
					this._removePoint(possibleChamberPoints,new Point(x, y));
				}
			}
		};
		while(chambers > 0 && possibleChamberPoints.length > 0)
		{
			let ranPoint = MathsFunctions.RandomPick(possibleChamberPoints);
			if(chamberPoints.length === 0)
			{
				addChamberPoint(ranPoint);
				chambers --;
			}
			else if(chamberPoints.some((chamberPoint) =>
			{
				if(Math.abs(ranPoint.x - chamberPoint.x) < this.chamberSize * 2 &&
						Math.abs(ranPoint.z - chamberPoint.z) < this.chamberSize * 2)
				{
					return true;
				}
			}))
			{
				this._removePoint(possibleChamberPoints, ranPoint);
			}
			else
			{
				addChamberPoint(ranPoint);
				chambers --;

			}
		}
		chamberPoints.forEach((chamberPoint) =>
		{
			for(let x = chamberPoint.x - floorHalfChamberSize; x < chamberPoint.x + floorHalfChamberSize + 1; x++)
			{
				for(let y = chamberPoint.z -floorHalfChamberSize; y < chamberPoint.z + floorHalfChamberSize + 1; y++)
				{
					let fillObj = this.fillGrid.grid[x][y];
					fillObj.filled = true;
					fillObj.joinable = false;
					fillObj.enclosed.forEach((val, index) =>
					{
						fillObj.enclosed[index] = false;
					});
					this._removePoint(gridPoints, new Point(x, y));
				}
			}
		});
		return chamberPoints
	}
	makeMaze(xDim, zDim, chambers = 0)
	{
		this.fillGrid = new FillGrid(xDim, zDim);
		let gridPoints = [];
		let gridPointsCopy = [];
		let joinablePoints = [];
		for(let x = 0; x < this.fillGrid.xDim; x ++)
		{
			for(let y = 0; y < this.fillGrid.zDim; y++)
			{
				gridPoints.push(new Point(x, y));
			}
		}
		let chamberPoints = this._doChamberPoints(chambers, gridPoints);
		let ranPoint = MathsFunctions.RandomPick(gridPoints);
		let start = new Point().setTo(ranPoint);
		ranPoint = MathsFunctions.RandomPick(gridPoints);
		let end = new Point().setTo(ranPoint);
		let done = false;
		do
		{
			let gridPathFinder = this.gridPathFinderPool.obtain({fillGrid: this.fillGrid, start: start,
					end: end, gridPaths: null, gridSquarePool: this.gridSquarePool,
					gridPathPool: this.gridPathPool});
			let obj = gridPathFinder.process();
			if(obj.pathActive)
			{
				let gridPath = gridPathFinder.gridPaths[obj.pathIndex];
				let prevDir = Direction.Directions.NONE;
				gridPath.gridSquares.forEach((gridSquare, index) =>
				{
					let fillPoint = this.fillGrid.grid[gridSquare.position.x][gridSquare.position.z];
					if(gridSquare.direction !== Direction.Directions.NONE)
					{
						fillPoint.enclosed[gridSquare.direction - 1] = false;
					}
					if(prevDir !== Direction.Directions.NONE)
					{
						let prevDirPoint = this.fillGrid.directionObj.directions[prevDir - 1].point;
						let enclosedIndex = this.fillGrid.directionObj.directions.findIndex((dir) =>
						{
							return dir.point.x === prevDirPoint.x * -1 &&
								dir.point.z === prevDirPoint.z * -1;
						});
						fillPoint.enclosed[enclosedIndex] = false;
					}
					prevDir = gridSquare.direction;
					fillPoint.filled = true;
					this._removePoint(gridPoints, gridSquare.position);
					joinablePoints.push(new Point(gridSquare.position.x, gridSquare.position.z));
				});
				if(gridPoints.length > 0)
				{
					do
					{
						start.setTo(MathsFunctions.RandomPick(joinablePoints));
						this._removePoint(joinablePoints, start);
					} while (this._boxedIn(start));
					gridPointsCopy = [...gridPoints];
					end.setTo(MathsFunctions.RandomPick(gridPointsCopy));
					this._removePoint(gridPointsCopy, end);
				}
				else
				{
					done = true;
				}
			}
			else if(gridPointsCopy.length > 0)
			{
				end.setTo(MathsFunctions.RandomPick(gridPointsCopy));
				this._removePoint(gridPointsCopy, end);
			}
			else
			{
				do
				{
					start.setTo(MathsFunctions.RandomPick(joinablePoints));
					this._removePoint(joinablePoints, start);
				} while (this._boxedIn(start));
				gridPointsCopy = [...gridPoints];
				end.setTo(MathsFunctions.RandomPick(gridPointsCopy));
				this._removePoint(gridPointsCopy, end);
			}
			this.gridPathFinderPool.free(gridPathFinder);
		}
		while(!done)
		this.chamberEntrances.length = 0;
		chamberPoints.forEach((chamberPoint) =>
		{
			let ranSide = this.fillGrid.directionObj.directions[MathsFunctions.RandomIntInclusive(0, Direction.Directions.S - 1)].point;
			let openSideIndex = this.fillGrid.directionObj.directions.findIndex((item) =>
			{
				return item.point.x === ranSide.x * -1 && item.point.z === ranSide.z * -1
			});
			let xOffset = (Math.floor(this.chamberSize / 2) + 1) * ranSide.x;
			let yOffest = (Math.floor(this.chamberSize / 2) + 1) * ranSide.z;
			this.chamberEntrances.push(new Point(chamberPoint.x + xOffset, chamberPoint.z + yOffest));
			this.fillGrid.grid[chamberPoint.x + xOffset]
					[chamberPoint.z + yOffest].enclosed[openSideIndex] = false;
		});
		return this.fillGrid;
	}
	_boxedIn(point)
	{
		let testPoint = new Point(0, 0);
		let boxedIn = true;
		for(let i = 0; i < this.fillGrid.directionObj.directions.length - 1; i++)
		{
			testPoint.x = this.fillGrid.directionObj.directions[i].point.x + point.x;
			testPoint.z = this.fillGrid.directionObj.directions[i].point.z + point.z;
			if(testPoint.x >= 0 && testPoint.x < this.fillGrid.xDim &&
					testPoint.z >= 0 && testPoint.z < this.fillGrid.zDim &&
					!this.fillGrid.grid[testPoint.x][testPoint.z].filled)
			{
				boxedIn = false;
				break;
			}
		}
		return boxedIn;
	}
	_removePoint(gridPoints, point)
	{
		let index = gridPoints.findIndex((gridPoint) =>
		{
			return gridPoint.x === point.x && gridPoint.z === point.z;
		});

		if(index >= 0)
		{
			gridPoints.splice(index, 1);
		}
	}
}
