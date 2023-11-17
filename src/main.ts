import "leaflet/dist/leaflet.css";
import "./style.css";
import leaflet from "leaflet";
import luck from "./luck";
import "./leafletWorkaround";
import { Board, Geocache, Cell, Geocoin } from "./board";

const MERRILL_CLASSROOM = leaflet.latLng({
  lat: 36.9995,
  lng: -122.0533,
});

const NULL_ISLAND = leaflet.latLng({
  lat: 0,
  lng: 0,
});

const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const CACHE_SPAWN_PROBABILITY = 0.1;
const VISIBILITY_RADIUS = 8;

const myBoard = new Board(TILE_DEGREES, VISIBILITY_RADIUS);

const arrayOfVisibleCaches: leaflet.Layer[] = [];
let arrayInventory: Geocoin[] = [];

const mapContainer = document.querySelector<HTMLElement>("#map")!;

const map = leaflet.map(mapContainer, {
  center: NULL_ISLAND,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: 0,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: true,
  scrollWheelZoom: true,
});

leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      // eslint-disable-next-line @typescript-eslint/quotes
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

const playerMarker = leaflet.marker(MERRILL_CLASSROOM);
playerMarker.bindTooltip("That's you!");
playerMarker.addTo(map);

if (localStorage.getItem("position")) {
  playerMarker.setLatLng(
    JSON.parse(localStorage.getItem("position")!) as leaflet.LatLng
  );
}

if (localStorage.getItem("inventory")) {
  arrayInventory = JSON.parse(localStorage.getItem("inventory")!) as Geocoin[];
}

if (localStorage.getItem("visited")) {
  myBoard.updateKnownCells(
    JSON.parse(localStorage.getItem("visited")!) as string[][]
  );
}

moveTo(playerMarker.getLatLng().lat, playerMarker.getLatLng().lng);
map.setView(playerMarker.getLatLng());

const sensorButton = document.querySelector("#sensor")!;
sensorButton.addEventListener("click", () => {
  navigator.geolocation.watchPosition((position) => {
    playerMarker.setLatLng(
      leaflet.latLng(position.coords.latitude, position.coords.longitude)
    );
    updatePlayer(playerMarker.getLatLng());
  });
});

const resetButton = document.querySelector("#reset")!;
resetButton.addEventListener("click", () => {
  const reset = confirm("Reset all data?");
  if (reset) {
    localStorage.clear();
    location.reload();
  }
});

const northButton = document.querySelector("#north")!;
northButton.addEventListener("click", () => {
  playerMarker.setLatLng(
    leaflet.latLng(
      playerMarker.getLatLng().lat + 1 * TILE_DEGREES,
      playerMarker.getLatLng().lng
    )
  );
  updatePlayer(playerMarker.getLatLng());
});

const southButton = document.querySelector("#south")!;
southButton.addEventListener("click", () => {
  playerMarker.setLatLng(
    leaflet.latLng(
      playerMarker.getLatLng().lat - 1 * TILE_DEGREES,
      playerMarker.getLatLng().lng
    )
  );
  updatePlayer(playerMarker.getLatLng());
});

const eastButton = document.querySelector("#east")!;
eastButton.addEventListener("click", () => {
  playerMarker.setLatLng(
    leaflet.latLng(
      playerMarker.getLatLng().lat,
      playerMarker.getLatLng().lng + 1 * TILE_DEGREES
    )
  );
  updatePlayer(playerMarker.getLatLng());
});

const westButton = document.querySelector("#west")!;
westButton.addEventListener("click", () => {
  playerMarker.setLatLng(
    leaflet.latLng(
      playerMarker.getLatLng().lat,
      playerMarker.getLatLng().lng - 1 * TILE_DEGREES
    )
  );
  updatePlayer(playerMarker.getLatLng());
});

const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
statusPanel.innerHTML = "Explore!";

function makeCache(i: number, j: number) {
  const cell = myBoard.getCellForPoint(
    leaflet.latLng({
      lat: i,
      lng: j,
    })
  );
  const bounds = myBoard.getCellBounds(cell);
  const cache = leaflet.rectangle(bounds) as leaflet.Layer;

  cache.bindPopup(() => {
    const popupContainer = document.createElement("div"); //create pop up
    popupContainer.innerHTML = `<div>There is a cache here at "${i},${j}". Collect Geocoins here.</div></br>`; //text for pop up

    addCoinsFromCache(myBoard.getCacheForPoint(cell), popupContainer);

    addCoinsFromInventory(myBoard.getCacheForPoint(cell), popupContainer);
    return popupContainer;
  });
  cache.addTo(map);
  arrayOfVisibleCaches.push(cache);
}

function getCachesNearby(point: leaflet.LatLng) {
  for (let i = -VISIBILITY_RADIUS; i < VISIBILITY_RADIUS; i++) {
    for (let j = -VISIBILITY_RADIUS; j < VISIBILITY_RADIUS; j++) {
      const x = point.lat + i * TILE_DEGREES;
      const y = point.lng + j * TILE_DEGREES;
      const cell = myBoard.getCellForPoint(leaflet.latLng({ lat: x, lng: y }));
      if (luck([cell.i, cell.j].toString()) < CACHE_SPAWN_PROBABILITY) {
        makeCache(cell.i, cell.j);
      }
    }
  }
}
getCachesNearby(playerMarker.getLatLng());

function updatePlayer(player: leaflet.LatLng) {
  map.setView(player);
  arrayOfVisibleCaches.forEach((cache) => {
    cache.remove();
  });
  localStorage.setItem(
    "position",
    JSON.stringify({
      lat: playerMarker.getLatLng().lat,
      lng: playerMarker.getLatLng().lng,
    })
  );

  getCachesNearby(player);
}

function addCoinsFromCache(geocache: Geocache, container: HTMLElement) {
  geocache.cacheCoins.forEach((coin) => {
    const currCoin = document.createElement("button") as HTMLElement;
    container.append(currCoin);
    currCoin.style.color = "Green";
    currCoin.innerHTML = `
            <div>Take: <span id="coin">${coin.serial}</span></div>`;

    const currHiddenCoin = document.createElement("button") as HTMLElement;
    currHiddenCoin.hidden = true;
    container.append(currHiddenCoin);
    currHiddenCoin.style.color = "Blue";
    currHiddenCoin.innerHTML = `
            <div>Place: <span id="coin">${coin.serial}</span></div>`;
    currCoin.addEventListener("click", () => {
      currCoin.hidden = true;
      currHiddenCoin.hidden = false;
      geocache.removeCoin(coin);
      arrayInventory.push(coin);
      updateCacheAtPoint(geocache.cell, geocache.cacheToString(), myBoard);
    });

    currHiddenCoin.addEventListener("click", () => {
      currCoin.hidden = false;
      currHiddenCoin.hidden = true;
      geocache.addCoin(coin);
      removeFromInventory(coin);
      updateCacheAtPoint(geocache.cell, geocache.cacheToString(), myBoard);
    });
  });
}

function addCoinsFromInventory(geocache: Geocache, container: HTMLElement) {
  arrayInventory.forEach((coin) => {
    const currCoin = document.createElement("button") as HTMLElement;
    container.append(currCoin);
    currCoin.style.color = "Blue";
    currCoin.innerHTML = `
            <div>Place: <span id="coin">${coin.serial}</span></div>`;
    const currHiddenCoin = document.createElement("button") as HTMLElement;
    currHiddenCoin.hidden = true;
    container.append(currHiddenCoin);
    currHiddenCoin.style.color = "Green";
    currHiddenCoin.innerHTML = `
            <div>Take: <span id="coin">${coin.serial}</span></div>`;

    currCoin.addEventListener("click", () => {
      currCoin.hidden = true;
      currHiddenCoin.hidden = false;
      geocache.addCoin(coin);
      removeFromInventory(coin);
      updateCacheAtPoint(geocache.cell, geocache.cacheToString(), myBoard);
    });

    currHiddenCoin.addEventListener("click", () => {
      currCoin.hidden = false;
      currHiddenCoin.hidden = true;
      geocache.removeCoin(coin);
      arrayInventory.push(coin);
      updateCacheAtPoint(geocache.cell, geocache.cacheToString(), myBoard);
    });
  });
}

function removeFromInventory(coin: Geocoin) {
  arrayInventory.forEach((item, index) => {
    if (item === coin) {
      arrayInventory.splice(index, 1);
    }
  });
}

function updateCacheAtPoint(cell: Cell, data: string, board: Board) {
  const { i, j } = cell;
  const key = [i, j].toString();
  board.knownCells.set(key, data);

  const jsonMap = JSON.stringify(Array.from(myBoard.knownCells.entries()));
  localStorage.setItem("visited", jsonMap);

  localStorage.setItem("inventory", JSON.stringify(arrayInventory));
}
