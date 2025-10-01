// cafe.js 

// filter helpers
let lastResults = [];
let lastLatLng = null;

function getFilter() {
  const sel = document.getElementById("openFilter");
  return sel ? sel.value : "all";
}

function applyFilterAndRender() {
  const mode = getFilter();
  let list = lastResults;

  if (mode === "closed") {
    list = lastResults.filter(p => p.opening_hours && p.opening_hours.open_now === false);
  } else if (mode === "open") {
    // double check on client 
    list = lastResults.filter(p => p.opening_hours && p.opening_hours.open_now === true);
  }

  const container = document.querySelector(".cards");
  if (!list.length) {
    container.innerHTML = `<p>No cafés match that filter.</p>`;
    return;
  }
  displayCards(list);
}

// 
document.addEventListener("change", (e) => {
  if (e.target && e.target.id === "openFilter") {
    if (lastResults.length) {
      applyFilterAndRender();
    } else if (lastLatLng) {
      runNearby(lastLatLng.lat, lastLatLng.lng); // re-fetch
    } else {
      getLocation();
    }
  }
});

// getting the geolocation
function getLocation() {
  const cache = JSON.parse(localStorage.getItem("cachedLocation") || "{}");
  const now = Date.now();

  if (cache.timestamp && now - cache.timestamp < 10 * 60 * 1000) {
    runNearby(cache.lat, cache.lng);
    return;
  }

  if (!("geolocation" in navigator)) {
    alert("Geolocation not supported in this browser.");
    // can test here for testing purpoes
    
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      localStorage.setItem("cachedLocation", JSON.stringify({ lat, lng, timestamp: now }));
      runNearby(lat, lng);
    },
    () => alert("Location access denied or unavailable.")
  );
}

// searching for places using js libary
function runNearby(lat, lng) {
  lastLatLng = { lat, lng };

  const container = document.querySelector(".cards");
  container.innerHTML = `
    <article class="location-card">
      <div class="ph"></div>
      <h3>Scouting cafés…</h3>
      <p>Fetching nearby spots.</p>
    </article>
  `;

  const wantOpenOnly = getFilter() === "open";

  const service = new google.maps.places.PlacesService(document.createElement("div"));
  service.nearbySearch(
    {
      location: new google.maps.LatLng(lat, lng),
      radius: 1500,
      type: "cafe",
      openNow: wantOpenOnly ? true : undefined,
    },
    (results, status, pagination) => {
      if (status !== google.maps.places.PlacesServiceStatus.OK) {
        container.innerHTML = `<p>Couldn’t load cafés (${status}). Try again.</p>`;
        return;
      }
      lastResults = results || [];
      applyFilterAndRender();

      // 
      if (pagination && pagination.hasNextPage) {
        const loadMore = document.createElement("button");
        loadMore.textContent = "Load more results";
        loadMore.onclick = () => {
          loadMore.disabled = true;
          pagination.nextPage();
        };
        container.appendChild(loadMore);
      }
    }
  );
}

// 
function displayCards(cafes) {
  const container = document.querySelector(".cards");
  container.innerHTML = "";

  cafes.forEach((cafe, i) => {
    const wrapper = document.createElement("div");
    wrapper.className = "swipe-wrapper";
    wrapper.style.zIndex = 200 - i;

    const card = document.createElement("article");
    card.className = "location-card";

    const photoUrl = cafe.photos?.[0]?.getUrl
      ? cafe.photos[0].getUrl({ maxWidth: 400 })
      : "https://via.placeholder.com/400x180?text=Cafe";

    const rating = cafe.rating ?? "N/A";
    const address = cafe.vicinity || "";

    // badge logic
    let badgeClass = "badge-unknown";
    let badgeText = "Hours unknown";
    if (cafe.opening_hours?.open_now === true) {
      badgeClass = "badge-open";
      badgeText = "Open now";
    } else if (cafe.opening_hours?.open_now === false) {
      badgeClass = "badge-closed";
      badgeText = "Closed now";
    }

    card.innerHTML = `
      <img src="${photoUrl}" alt="${cafe.name}" />
      <div class="card-body">
        <h3>${cafe.name}</h3>
        <p>
          <span class="badge ${badgeClass}">${badgeText}</span>
          &nbsp; ⭐️ ${rating}
        </p>
        ${address ? `<p><small>${address}</small></p>` : ""}
        <p><small>Swipe to save 🎀 (function coming soon)</small></p>
      </div>
    `;

    wrapper.appendChild(card);
    container.appendChild(wrapper);
  });
}
