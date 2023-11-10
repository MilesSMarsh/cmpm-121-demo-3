import "leaflet/dist/leaflet.css";
import "./style.css";
import leaflet, { TileLayer } from "leaflet";
import luck from "./luck";
import "./leafletWorkaround";
import { Board } from "./board.ts";

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
console.log(myBoard);

const arrayOfVisibleCaches: leaflet.Layer[] = [];
const arrayOfMementos: string[] = [];

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
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

const playerMarker = leaflet.marker(MERRILL_CLASSROOM);
playerMarker.bindTooltip("That's you!");
playerMarker.addTo(map);
moveTo(playerMarker.getLatLng().lat, playerMarker.getLatLng().lng);

const sensorButton = document.querySelector("#sensor")!;
sensorButton.addEventListener("click", () => {
  navigator.geolocation.watchPosition((position) => {
    playerMarker.setLatLng(
      leaflet.latLng(position.coords.latitude, position.coords.longitude)
    );
    updatePlayer(playerMarker.getLatLng());
  });
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
statusPanel.innerHTML = "No points yet...";

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
    const value = Math.floor(luck([i, j, "initialValue"].toString()) * 10);

    const container = document.createElement("div");
    container.innerHTML = `
                <div>There is a cache here at "${i},${j}". Collect Geocoins here.</div>`;
    for (let x = 0; x <= value; x++) {
      const coin = JSON.stringify({ i, j, x });
      if (arrayOfMementos.includes(coin)) {
        continue;
      }
      const currCoin = document.createElement("button") as HTMLElement;
      container.append(currCoin);
      currCoin.innerHTML = `
                <div>"GeoCoin: <span id="coin">${coin}</span></div>`;
      currCoin.addEventListener("click", () => {
        console.log(arrayOfMementos);
        arrayOfMementos.push(coin);
        currCoin.remove();
      });
    }

    return container;
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
  getCachesNearby(player);
}
