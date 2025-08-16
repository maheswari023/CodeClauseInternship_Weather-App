
const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_URL = "https://api.open-meteo.com/v1/forecast";

const body = document.body;
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const locBtn = document.getElementById("locBtn");
const suggestions = document.getElementById("suggestions");
const unitToggle = document.getElementById("unitToggle");
const themeToggle = document.getElementById("themeToggle");

const statusBox = document.getElementById("status");
const currentCard = document.getElementById("currentCard");
const hourlyCard = document.getElementById("hourlyCard");
const forecastCard = document.getElementById("forecastCard");

const placeName = document.getElementById("placeName");
const dateTime = document.getElementById("dateTime");
const tempNow = document.getElementById("tempNow");
const feelsLike = document.getElementById("feelsLike");
const nowIcon = document.getElementById("nowIcon");
const conditionText = document.getElementById("conditionText");
const humidityEl = document.getElementById("humidity");
const windEl = document.getElementById("wind");
const pressureEl = document.getElementById("pressure");
const sunriseEl = document.getElementById("sunrise");
const sunsetEl = document.getElementById("sunset");

const hourlySpark = document.getElementById("hourlySpark");
const forecastGrid = document.getElementById("forecastGrid");

const recentList = document.getElementById("recentList");
const clearRecentBtn = document.getElementById("clearRecent");


let state = {
  unit: localStorage.getItem("unit") || "C", // "C" or "F"
  theme: localStorage.getItem("theme") || "dark", // "dark" or "light"
  recent: JSON.parse(localStorage.getItem("recent") || "[]"),
  lastResult: null,
};


const W = {
  0:  ["Clear sky", "☀️"],
  1:  ["Mainly clear", "🌤️"],
  2:  ["Partly cloudy", "⛅"],
  3:  ["Overcast", "☁️"],
  45: ["Fog", "🌫️"],
  48: ["Depositing rime fog", "🌫️"],
  51: ["Light drizzle", "🌦️"],
  53: ["Moderate drizzle", "🌦️"],
  55: ["Dense drizzle", "🌧️"],
  56: ["Light freezing drizzle", "🌧️"],
  57: ["Dense freezing drizzle", "🌧️"],
  61: ["Slight rain", "🌧️"],
  63: ["Moderate rain", "🌧️"],
  65: ["Heavy rain", "🌧️"],
  66: ["Light freezing rain", "🌧️"],
  67: ["Heavy freezing rain", "🌧️"],
  71: ["Slight snow fall", "🌨️"],
  73: ["Moderate snow fall", "🌨️"],
  75: ["Heavy snow fall", "❄️"],
  77: ["Snow grains", "🌨️"],
  80: ["Rain showers: slight", "🌦️"],
  81: ["Rain showers: moderate", "🌦️"],
  82: ["Rain showers: violent", "🌧️"],
  85: ["Snow showers: slight", "🌨️"],
  86: ["Snow showers: heavy", "❄️"],
  95: ["Thunderstorm", "⛈️"],
  96: ["Thunderstorm with slight hail", "⛈️"],
  99: ["Thunderstorm with heavy hail", "⛈️"],
};
function wcText(code){ return (W[code]?.[0]) || "—"; }
function wcIcon(code){ return (W[code]?.[1]) || "⛅"; }


const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const toF = c => (c * 9/5) + 32;
const fmtTemp = (c, unit="C") => {
  if (c == null) return "—";
  return unit === "F" ? `${Math.round(toF(c))}°F` : `${Math.round(c)}°C`;
};
function formatTime(isoStr, options={}){
  try {
    const d = new Date(isoStr);
    return d.toLocaleString(undefined, { ...options, hour12: true });
  } catch { return "—"; }
}
function saveState(){
  localStorage.setItem("unit", state.unit);
  localStorage.setItem("theme", state.theme);
  localStorage.setItem("recent", JSON.stringify(state.recent.slice(0,10)));
}


function renderRecent(){
  recentList.innerHTML = "";
  if(state.recent.length === 0){
    recentList.innerHTML = `<li style="justify-content:center;color:var(--muted)">No recent searches</li>`;
    return;
  }
  state.recent.slice(0,10).forEach((r, idx) => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.textContent = "↻";
    btn.title = "Load this location";
    btn.onclick = () => fetchByCoords(r);
    const txt = document.createElement("span");
    txt.textContent = `${r.name} ${r.country ? "• " + r.country : ""}`;
    txt.style.cursor = "pointer";
    txt.onclick = () => fetchByCoords(r);
    const del = document.createElement("button");
    del.textContent = "✕";
    del.title = "Remove";
    del.onclick = () => {
      state.recent.splice(idx,1);
      saveState(); renderRecent();
    };
    li.append(txt, btn, del);
    recentList.appendChild(li);
  });
}


let suggestionTimer = null;
searchInput.addEventListener("input", () => {
  const q = searchInput.value.trim();
  clearTimeout(suggestionTimer);
  if(q.length < 2){ suggestions.classList.add("hidden"); return; }
  suggestionTimer = setTimeout(async () => {
    const res = await fetch(`${GEO_URL}?name=${encodeURIComponent(q)}&count=5&language=en&format=json`);
    const data = await res.json();
    suggestions.innerHTML = "";
    (data.results || []).forEach(item => {
      const div = document.createElement("div");
      div.className = "item";
      div.textContent = `${item.name}, ${item.admin1 || ""} ${item.country ? "— " + item.country : ""}`.replace(/,\s—/,' —');
      div.onclick = () => {
        suggestions.classList.add("hidden");
        fetchByCoords({
          name: item.name,
          country: item.country,
          latitude: item.latitude,
          longitude: item.longitude,
          timezone: item.timezone
        });
      };
      suggestions.appendChild(div);
    });
    suggestions.classList.toggle("hidden", suggestions.children.length === 0);
  }, 250);
});
document.addEventListener("click", (e) => {
  if(!e.target.closest(".search-wrap")) suggestions.classList.add("hidden");
});


function applyTheme(){
  if(state.theme === "light") body.classList.add("light");
  else body.classList.remove("light");
}
applyTheme();
themeToggle.checked = state.theme === "light";
unitToggle.checked = state.unit === "F";
renderRecent();


themeToggle.addEventListener("change", () => {
  state.theme = themeToggle.checked ? "light" : "dark";
  applyTheme(); saveState();
});
unitToggle.addEventListener("change", () => {
  state.unit = unitToggle.checked ? "F" : "C";
  if(state.lastResult) renderWeather(state.lastResult);
  saveState();
});
searchBtn.addEventListener("click", () => {
  const q = searchInput.value.trim();
  if(!q) return;
  searchCity(q);
});
searchInput.addEventListener("keydown", (e) => {
  if(e.key === "Enter") searchBtn.click();
});
locBtn.addEventListener("click", () => {
  if(!navigator.geolocation){
    setStatus("Geolocation not supported in this browser.");
    return;
  }
  setStatus("Getting your location…");
  navigator.geolocation.getCurrentPosition(async (pos) => {
    const { latitude, longitude } = pos.coords;
   
    const res = await fetch(`${GEO_URL}?latitude=${latitude}&longitude=${longitude}&count=1&format=json`);
    const data = await res.json();
    const name = data?.results?.[0]?.name || "Current Location";
    const country = data?.results?.[0]?.country || "";
    fetchByCoords({ name, country, latitude, longitude });
  }, (err) => {
    setStatus("Location permission denied. Try searching a city.");
  }, { enableHighAccuracy: true, timeout: 10000 });
});
clearRecentBtn.addEventListener("click", () => {
  state.recent = []; saveState(); renderRecent();
});


function setStatus(msg){
  statusBox.textContent = msg;
  statusBox.classList.remove("hidden");
}
function hideStatus(){
  statusBox.classList.add("hidden");
}

async function searchCity(q){
  setStatus("Searching cities…");
  try{
    const res = await fetch(`${GEO_URL}?name=${encodeURIComponent(q)}&count=1&language=en&format=json`);
    const data = await res.json();
    const hit = data?.results?.[0];
    if(!hit){ setStatus("No results. Try another city or spelling."); return; }
    fetchByCoords({
      name: hit.name,
      country: hit.country,
      latitude: hit.latitude,
      longitude: hit.longitude,
      timezone: hit.timezone
    });
  }catch(e){
    setStatus("Network error while searching. Check your connection.");
  }
}

async function fetchByCoords(place){
  setStatus("Fetching weather…");
  try{
    const params = new URLSearchParams({
      latitude: place.latitude,
      longitude: place.longitude,
      timezone: "auto",
      current: [
        "temperature_2m",
        "relative_humidity_2m",
        "apparent_temperature",
        "is_day",
        "precipitation",
        "weather_code",
        "wind_speed_10m",
        "wind_direction_10m",
        "pressure_msl"
      ].join(","),
      daily: [
        "weather_code",
        "temperature_2m_max",
        "temperature_2m_min",
        "sunrise",
        "sunset",
        "precipitation_sum"
      ].join(","),
      hourly: [
        "temperature_2m",
        "apparent_temperature",
        "relative_humidity_2m",
        "precipitation_probability",
        "weather_code"
      ].join(",")
    });
    const res = await fetch(`${WEATHER_URL}?${params.toString()}`);
    const wx = await res.json();
    state.lastResult = { place, wx };
    renderWeather(state.lastResult);
    // Save to recent
    const r = { name: place.name, country: place.country, latitude: place.latitude, longitude: place.longitude };
    state.recent = [r, ...state.recent.filter(x => x.latitude!==r.latitude || x.longitude!==r.longitude)].slice(0,10);
    saveState(); renderRecent();
    hideStatus();
  }catch(e){
    console.error(e);
    setStatus("Failed to fetch weather. Please try again.");
  }
}

function renderWeather({ place, wx }){
  // Top section
  placeName.textContent = `${place.name}${place.country ? ", " + place.country : ""}`;
  dateTime.textContent = formatTime(new Date().toISOString(), { dateStyle:"medium", timeStyle:"short" });

  const c = wx.current;
  const d = wx.daily;

  tempNow.textContent = fmtTemp(c.temperature_2m, state.unit);
  feelsLike.textContent = fmtTemp(c.apparent_temperature, state.unit);
  conditionText.textContent = wcText(c.weather_code);
  nowIcon.textContent = wcIcon(c.weather_code);
  humidityEl.textContent = `${Math.round(c.relative_humidity_2m)}%`;
  windEl.textContent = `${Math.round(c.wind_speed_10m)} km/h • ${degToCompass(c.wind_direction_10m)}`;
  pressureEl.textContent = `${Math.round(c.pressure_msl)} hPa`;
  sunriseEl.textContent = shortTime(d.sunrise[0]);
  sunsetEl.textContent = shortTime(d.sunset[0]);

  // Hourly sparkline (next 24 points)
  renderSpark(wx);

  // 7-day forecast
  renderForecast(wx);

  // Show cards
  currentCard.classList.remove("hidden");
  hourlyCard.classList.remove("hidden");
  forecastCard.classList.remove("hidden");
}

/* Sparkline using SVG */
function renderSpark(wx){
  const hours = wx.hourly.time.map(t => new Date(t));
  const tempsC = wx.hourly.temperature_2m;
  const now = new Date();
  // take next 24 hours starting from the current index
  const idx = hours.findIndex(h => h.getTime() >= now.getTime());
  const start = idx >= 0 ? idx : 0;
  const end = clamp(start + 24, 0, hours.length);
  const sliceTemps = tempsC.slice(start, end);
  const labels = hours.slice(start, end).map(h => h.toLocaleTimeString([], { hour: "numeric" }));

  const values = state.unit === "F" ? sliceTemps.map(toF) : sliceTemps.slice();
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min) === 0 ? 1 : (max - min);
  const W = hourlySpark.clientWidth || 600;
  const H = hourlySpark.clientHeight || 120;

  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * (W - 20) + 10;
    const y = H - ((v - min) / pad) * (H - 30) - 10;
    return `${x},${y}`;
  }).join(" ");

  hourlySpark.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
      <polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="2" opacity=".9"></polyline>
      ${values.map((v,i) => {
        const x = (i / (values.length - 1)) * (W - 20) + 10;
        const y = H - ((v - min) / pad) * (H - 30) - 10;
        const lbl = `${Math.round(v)}°${state.unit}`;
        const time = labels[i];
        return `
          <circle cx="${x}" cy="${y}" r="2.5"></circle>
          <title>${time}: ${lbl}</title>
        `;
      }).join("")}
      <text x="10" y="${H-8}" font-size="10" opacity=".6">${Math.round(min)}°${state.unit}</text>
      <text x="${W-40}" y="12" font-size="10" text-anchor="end" opacity=".6">${Math.round(max)}°${state.unit}</text>
    </svg>
  `;
}

function renderForecast(wx){
  forecastGrid.innerHTML = "";
  const tpl = document.getElementById("forecastItemTpl");
  const days = wx.daily.time.length;
  for(let i=0;i<days;i++){
    const node = tpl.content.cloneNode(true);
    const date = new Date(wx.daily.time[i]);
    node.querySelector(".fi-date").textContent = date.toLocaleDateString([], { weekday:"short", month:"short", day:"numeric" });
    node.querySelector(".fi-icon").textContent = wcIcon(wx.daily.weather_code[i]);
    const tmin = wx.daily.temperature_2m_min[i];
    const tmax = wx.daily.temperature_2m_max[i];
    node.querySelector(".fi-temp").textContent = `${fmtTemp(tmin, state.unit)} / ${fmtTemp(tmax, state.unit)}`;
    const pr = wx.daily.precipitation_sum?.[i] ?? 0;
    node.querySelector(".fi-precip").textContent = `Precip: ${Math.round(pr)} mm`;
    forecastGrid.appendChild(node);
  }
}


function degToCompass(deg){
  const dirs = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}
function shortTime(iso){ return formatTime(iso, { timeStyle: "short" }); }


(function init(){
  
  if(state.recent.length){
    renderRecent();
  } else {
    
    searchCity("Hyderabad");
  }
})();
