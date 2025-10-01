// cafe.js 

// helper functions
let lastResults = [];
let lastLatLng = null;

function getSaved() {
  return JSON.parse(localStorage.getItem('savedCafes') || '[]');
}
function setSaved(list) {
  localStorage.setItem('savedCafes', JSON.stringify(list));
  updateSavedCount();
}
function updateSavedCount() {
  const el = document.getElementById('savedCount');
  if (el) {
    const n = getSaved().length;
    el.textContent = n ? `(${n})` : '';
  }
}
// call once on load
document.addEventListener('DOMContentLoaded', updateSavedCount);
function getFilter() {
  const sel = document.getElementById("openFilter");
  return sel ? sel.value : "all";
}

function saveCafe(cafe) {
  const saved = JSON.parse(localStorage.getItem('savedCafes') || '[]');
  if (!saved.find(c => c.place_id === cafe.place_id)) {
    saved.push(cafe);
    localStorage.setItem('savedCafes', JSON.stringify(saved));
    //
    try { navigator.vibrate && navigator.vibrate(30); } catch {}
  } else {
    // already saveddd
  }
}

function clearSaved() {
  setSaved([]);
  showSaved();
}


function showSaved() {
  const container = document.querySelector('.cards');
  container.innerHTML = '';
  const saved = getSaved();
  if (!saved.length) {
    container.innerHTML = '<p>No saved cafés yet 😢</p>';
    return;
  }
  saved.forEach(c => {
    const card = document.createElement('article');
    card.className = 'location-card';
    card.innerHTML = `
      <img src="${c.photo}" alt="${c.name}" />
      <div class="card-body">
        <h3>${c.name}</h3>
        <p>⭐️ ${c.rating ?? 'N/A'}</p>
        ${c.address ? `<p><small>${c.address}</small></p>` : ''}
        <button class="remove-btn" type="button">Remove</button>
      </div>
    `;
    card.querySelector('.remove-btn').onclick = () => {
      const list = getSaved().filter(x => x.place_id !== c.place_id);
      setSaved(list);
      showSaved();
    };
    container.appendChild(card);
  });
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
      radius: 3000,
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

// display cards functions and swipe gestures and saved cafe data 
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

    // object we store if user saves
    const cafeObj = {
      name: cafe.name,
      place_id: cafe.place_id,
      photo: photoUrl,
      rating,
      address
    };

    card.innerHTML = `
      <img src="${photoUrl}" alt="${cafe.name}" />
      <div class="card-body">
        <h3>${cafe.name}</h3>
        <p>
          <span class="badge ${badgeClass}">${badgeText}</span>
          &nbsp; ⭐️ ${rating}
        </p>
        ${address ? `<p><small>${address}</small></p>` : ""}
        <div class="actions-row">
          <button class="save-btn" type="button">💖 Save</button>
        </div>
      </div>
    `;

    // clicking to save
    card.querySelector(".save-btn").onclick = () => {
      saveCafe(cafeObj);
      // tiny visual nudge
      wrapper.style.transform = 'translateX(150%) rotate(12deg)';
      wrapper.style.opacity = 0;
      setTimeout(() => wrapper.remove(), 120);
    };

    wrapper.appendChild(card);
    container.appendChild(wrapper);

    // swipe gestures using hammer (implemented in html already)
    if (window.Hammer) {
      const hammertime = new Hammer(wrapper);
      hammertime.on('swipeleft', () => {
        wrapper.style.transform = 'translateX(-150%) rotate(-12deg)';
        wrapper.style.opacity = 0;
        setTimeout(() => wrapper.remove(), 120);
      });
      hammertime.on('swiperight', () => {
        saveCafe(cafeObj);
        wrapper.style.transform = 'translateX(150%) rotate(12deg)';
        wrapper.style.opacity = 0;
        setTimeout(() => wrapper.remove(), 120);
      });
    }
  });
}
