import leaflet from "leaflet";
import luck from "./luck";

const MAX_COINS_PER_CELL = 10;

export interface Cell {
  readonly i: number;
  readonly j: number;
}

export class Board {
  readonly tileWidth: number;
  readonly tileVisibilityRadius: number;

  knownCells: Map<string, string>;

  constructor(tileWidth: number, tileVisibilityRadius: number) {
    this.tileWidth = tileWidth;
    this.tileVisibilityRadius = tileVisibilityRadius;
    this.knownCells = new Map();
  }

  private getCanonicalCell(cell: Cell): Cell {
    const { i, j } = cell;
    const cache = new Geocache(cell);
    const key = [i, j].toString();
    if (!this.knownCells.has(key)) {
      cache.generateCoinsForCell(cell);
      this.knownCells.set(key, cache.cacheToString());
    }
    return cache.cell;
  }

  getCacheForPoint(cell: Cell): Geocache {
    const { i, j } = cell;
    const key = [i, j].toString();
    return new Geocache(cell).stringToCache(this.knownCells.get(key)!);
  }

  getCellForPoint(point: leaflet.LatLng): Cell {
    return this.getCanonicalCell({
      i: Number(point.lat.toFixed(4)),
      j: Number(point.lng.toFixed(4)),
    });
  }

  getCellBounds(cell: Cell): leaflet.LatLngBounds {
    return leaflet.latLngBounds(
      [cell.i, cell.j],
      [cell.i + this.tileWidth, cell.j + this.tileWidth]
    );
  }

  getCellsNearPoint(point: leaflet.LatLng): Cell[] {
    const originCell = this.getCellForPoint(point);
    const resultCells: Cell[] = [
      { i: originCell.i + 1, j: originCell.j },
      { i: originCell.i, j: originCell.j + 1 },
      { i: originCell.i - 1, j: originCell.j },
      { i: originCell.i, j: originCell.j - 1 },
      { i: originCell.i + 1, j: originCell.j + 1 },
      { i: originCell.i + 1, j: originCell.j - 1 },
      { i: originCell.i - 1, j: originCell.j + 1 },
      { i: originCell.i - 1, j: originCell.j - 1 },
    ];
    return resultCells;
  }
}

export class Geocoin {
  cell: Cell;
  serial: string;
  constructor(cell: Cell, serialNum: number) {
    this.cell = cell;
    this.serial = [this.cell.i, this.cell.j, serialNum].toString();
  }

  toString() {
    return JSON.stringify(this);
  }
}

export class Geocache {
  cell: Cell;
  cacheCoins: Geocoin[] = [];
  constructor(cell: Cell) {
    this.cell = cell;
  }

  removeCoin(coin: Geocoin) {
    //add functionallity
    this.cacheCoins.forEach((item, index) => {
      if (item === coin) {
        this.cacheCoins.splice(index, 1);
      }
    });
  }

  generateCoinsForCell(cell: Cell) {
    const { i, j } = cell;
    const value = Math.floor(
      luck([i, j, "initialValue"].toString()) * MAX_COINS_PER_CELL
    );
    for (let x = 0; x <= value; x++) {
      const coin = new Geocoin(cell, x);
      this.addCoin(coin);
    }
  }

  addCoin(coin: Geocoin) {
    this.cacheCoins.push(coin);
  }

  cacheToString(): string {
    return JSON.stringify(this);
  }

  stringToCache(cacheData: string): Geocache {
    const cache = JSON.parse(cacheData) as Geocache;
    this.cell = cache.cell;
    this.cacheCoins = cache.cacheCoins;
    return this;
  }
}
