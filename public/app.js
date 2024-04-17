/// <reference lib="DOM" />

//
// A very minimal client app to view metrics from the API
//

const dateFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: "short",
  timeStyle: "medium",
});

const numberFormat = new Intl.NumberFormat(undefined, {
  notation: "compact",
});

function main() {
  updateMeta();
  setInterval(30_000, () => updateMeta());

  const visitorFilter = document.getElementById("visitorFilter");
  const typeFilter = document.getElementById("typeFilter");

  //
  // Update the table when a filter changes
  //

  visitorFilter.addEventListener("change", (e) => {
    const visitor = e.target.value;
    if (!visitor) return;
    typeFilter.value = "";
    showData(`/visitors/${visitor}`);
    replaceQuery(new URLSearchParams({ visitor }));
  });

  typeFilter.addEventListener("change", (e) => {
    const type = e.target.value;
    if (!type) return;
    visitorFilter.value = "";
    showData(`/events/${type}`);
    replaceQuery(new URLSearchParams({ type }));
  });

  const url = new URL(location.href);

  //
  // Initially filter data for search parameters on page-load
  //
  if (url.searchParams.get("visitor")) {
    const visitor = url.searchParams.get("visitor");
    visitorFilter.value = visitor;
    showData(`/visitors/${visitor}`);
  } else if (url.searchParams.get("type")) {
    const type = url.searchParams.get("type");
    typeFilter.value = type;
    showData(`/events/${type}`);
  }
}

// Update that top section
async function updateMeta() {
  const { events, visitors, types } = await fetch("/meta").then((r) =>
    r.json()
  );

  updateTile("events", events);
  updateTile("visitors", visitors.length);
  updateTile("types", types.length);

  updateFilter("typeFilter", types);
  updateFilter("visitorFilter", visitors);
}

function updateTile(id, value) {
  document.querySelector(`#${id} .tile-value`).textContent =
    numberFormat.format(parseFloat(value));
}

function updateFilter(id, values) {
  const select = document.getElementById(id);
  const existingOptions = new Set(
    Array.from(select.querySelectorAll("option")).map((o) => o.value)
  );
  for (const value of values.filter((v) => !existingOptions.has(v))) {
    const o = document.createElement("option");
    o.value = value;
    o.textContent = value;
    select.append(o);
  }
}

// Fetch Event records and show them in a table
async function showData(endpoint) {
  document.getElementById("splash")?.remove();

  const table = document.querySelector("#output");
  table.innerHTML = "";

  const thead = table.appendChild(document.createElement("thead"));
  thead.innerHTML = `
  <tr>
    <th>id</th>
    <th>date</th>
    <th>event</th>
    <th>visitor</th>
    <th>payload</th>
  </tr>
  `;

  const tbody = table.appendChild(document.createElement("tbody"));
  const data = await fetch(endpoint).then((r) => r.json());

  for (const record of data) {
    const tr = tbody.appendChild(document.createElement("tr"));
    tr.innerHTML += `<td>${record.id}</td>`;
    tr.innerHTML += `<td>${dateFormat.format(new Date(record.created))}</td>`;
    tr.innerHTML += `<td>${record.name}</td>`;
    tr.innerHTML += `<td>${record.visitor}</td>`;
    tr.innerHTML += `<td><code>${JSON.stringify(record.payload)}</code></td>`;
  }
}

// Modify the URL without reloading
function replaceQuery(params) {
  history.pushState(null, "", location.pathname + "?" + params.toString());
}

main();
