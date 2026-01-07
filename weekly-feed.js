// ---- TINY PLAYER DRAG (SAFE FIX) ----
const tinyPlayer = document.getElementById("tinyPlayer");
const tinyHeader = document.getElementById("tinyHeader");

if (tinyPlayer && tinyHeader) {
  let isDragging = false;
  let startX = 0;
  let startY = 0;

  tinyHeader.addEventListener("mousedown", (e) => {
    isDragging = true;
    startX = e.clientX - tinyPlayer.offsetLeft;
    startY = e.clientY - tinyPlayer.offsetTop;
    document.body.style.userSelect = "none";
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    tinyPlayer.style.left = e.clientX - startX + "px";
    tinyPlayer.style.top = e.clientY - startY + "px";
  });

  document.addEventListener("mouseup", () => {
    isDragging = false;
    document.body.style.userSelect = "";
    console.log("[Tiny Drag] end");
  });
}
// ---- WEEKLY WONDER: GOOGLE SHEET FEED (SAFE) ----

// 1. PASTE YOUR CSV URL HERE
const SHEET_URL =
"https://docs.google.com/spreadsheets/d/e/2PACX-1vRyetuOKbKO3GITmuORx41qIQ0iyIL7pgJHrWZtU5pU6GzEbn4UJijrVcfLFq7nPBG6W1cLDl-Mxar-/pub?gid=0&single=true&output=csv";

// 2. Wait for page load
document.addEventListener("DOMContentLoaded", () => {
  const feed = document.getElementById("weekly-feed");

  if (!feed) {
    console.warn("[Weekly Feed] #weekly-feed not found");
    return;
  }

  fetch(SHEET_URL)
    .then((res) => {
      console.log("[Weekly Feed] Fetch response status:", res.status);
      return res.text();
    })
    .then((csv) => {
      console.log("[Weekly Feed] CSV data received, length:", csv.length);
      const rows = csv.split("\n").slice(1); // skip header
      console.log("[Weekly Feed] Number of rows:", rows.length);
      feed.innerHTML = ""; // clear placeholder

      const weekBlock = document.createElement("div");
      weekBlock.className = "week-block";

      const label = document.createElement("h2");
      label.className = "week-label";
      label.textContent = "Latest Weekly Wonder";
      weekBlock.appendChild(label);

      const grid = document.createElement("div");
      grid.className = "week-grid";

      rows.forEach((row) => {
        if (!row.trim()) return;

        const cols = parseCSVRow(row);

        const title = cols[4] || "";
        const link = cols[5] || "";
        const image = cols[6] || "";
        const type = cols[3] || "";
        const notes = cols[7] || "";

        // Debug: log what we're getting
        console.log("[Weekly Feed] Card:", { title, type, image: image.substring(0, 50) + "..." });

        const card = document.createElement("div");
        card.className = "card";

        // Add data attributes for search filtering
        card.setAttribute("data-title", title.toLowerCase());
        card.setAttribute("data-type", type.toLowerCase());
        card.setAttribute("data-notes", notes.toLowerCase());
        card.setAttribute("data-link", link.toLowerCase());

        card.innerHTML = `
          <img src="${image}" alt="" class="thumb">
          <div class="card-meta">
            <div class="card-title">${title}</div>
            <div class="card-sub">${type}</div>
            ${notes ? `<div class="card-notes">${notes}</div>` : ""}
          </div>
        `;

        if (link) {
          card.addEventListener("click", () => {
            window.open(link, "_blank");
          });
        }

        grid.appendChild(card);
      });

      weekBlock.appendChild(grid);
      feed.appendChild(weekBlock);

      console.log("[Weekly Feed] loaded safely");

      // ---- SEARCH FUNCTIONALITY ----
      const searchInput = document.querySelector(".search-bar input");

      if (searchInput) {
        let debounceTimer;

        searchInput.addEventListener("input", (e) => {
          clearTimeout(debounceTimer);

          debounceTimer = setTimeout(() => {
            const query = e.target.value.toLowerCase().trim();
            const cards = document.querySelectorAll(".card");
            const weekBlocks = document.querySelectorAll(".week-block");

            if (query === "") {
              // Show all cards when search is empty
              cards.forEach(card => card.style.display = "");
              weekBlocks.forEach(block => block.style.display = "");
              return;
            }

            // Filter cards
            cards.forEach(card => {
              const title = card.getAttribute("data-title") || "";
              const type = card.getAttribute("data-type") || "";
              const notes = card.getAttribute("data-notes") || "";
              const link = card.getAttribute("data-link") || "";

              const matches =
                title.includes(query) ||
                type.includes(query) ||
                notes.includes(query) ||
                link.includes(query);

              card.style.display = matches ? "" : "none";
            });

            // Hide week blocks if all cards inside are hidden
            weekBlocks.forEach(block => {
              const visibleCards = block.querySelectorAll(".card:not([style*='display: none'])");
              block.style.display = visibleCards.length > 0 ? "" : "none";
            });
          }, 200); // 200ms debounce
        });

        console.log("[Weekly Feed] search initialized");
      }
    })
    .catch((err) => {
      console.error("[Weekly Feed] error", err);
    });
});
function parseCSVRow(line) {
  line = line.replace(/\r$/, ""); // remove trailing CR
  const out = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      // handle escaped quotes ""
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map(v => v.trim());
}
