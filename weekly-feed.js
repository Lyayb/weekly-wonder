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
      feed.innerHTML = ""; // clear placeholder

      // Split CSV, skip header, process ALL data rows
      const allRows = csv.split("\n");
      const dataRows = allRows.slice(1); // skip header

      console.log(`[Weekly Feed] Total data rows: ${dataRows.length}`);

      // Collect valid items (with limit)
      const validItems = [];
      const MAX_CARDS = 4;

      dataRows.forEach((row, index) => {
        if (validItems.length >= MAX_CARDS) return; // Stop once we have 4 valid items
        if (!row.trim()) return; // Skip empty lines

        const cols = parseCSVRow(row);

        // Extract data from columns
        const week = cols[0] || "";
        const date = cols[1] || "";
        const title = cols[4] || "";
        const link = cols[5] || "";
        const image = cols[6] || "";
        const type = cols[3] || "";
        const notes = cols[8] || "";

        console.log(`[Weekly Feed] Row ${index + 2}: week="${week}", title="${title}", image="${image.substring(0, 30)}..."`);

        // Only add if it has ALL required fields
        if (week.trim() && title.trim() && image.trim()) {
          validItems.push({
            week,
            date,
            title,
            link,
            image,
            type,
            notes
          });
          console.log(`[Weekly Feed] ✓ Valid item ${validItems.length}: ${title}`);
        } else {
          console.log(`[Weekly Feed] ✗ Skipped incomplete row ${index + 2}`);
        }
      });

      console.log(`[Weekly Feed] Total valid items: ${validItems.length}`);

      // Group valid items by week
      const weekGroups = {};

      validItems.forEach((item) => {
        if (!weekGroups[item.week]) {
          weekGroups[item.week] = {
            date: item.date,
            items: []
          };
        }

        weekGroups[item.week].items.push({
          title: item.title,
          link: item.link,
          image: item.image,
          type: item.type,
          notes: item.notes
        });
      });

      // Create a week block for each group
      console.log(`[Weekly Feed] Total weeks found: ${Object.keys(weekGroups).length}`);

      let cardsCreatedCount = 0;

      Object.keys(weekGroups).forEach((weekLabel) => {
        const weekData = weekGroups[weekLabel];

        console.log(`[Weekly Feed] Processing week: ${weekLabel}, items: ${weekData.items.length}`);

        const weekBlock = document.createElement("div");
        weekBlock.className = "week-block";

        const label = document.createElement("h2");
        label.className = "week-label";
        // Format: "Week 01.08.2026" or just week label if no date
        label.textContent = weekData.date ? `Week ${weekData.date}` : weekLabel;
        weekBlock.appendChild(label);

        const grid = document.createElement("div");
        grid.className = "week-grid";

        // Add items for this week - ABSOLUTE LIMIT OF 4 CARDS
        weekData.items.forEach((item) => {
          if (cardsCreatedCount >= MAX_CARDS) {
            console.log(`[Weekly Feed] HARD STOP - Already created ${MAX_CARDS} cards, skipping: ${item.title}`);
            return;
          }
          cardsCreatedCount++;
          console.log(`[Weekly Feed] Creating card ${cardsCreatedCount}/${MAX_CARDS}: ${item.title}`);
          const card = document.createElement("div");
          card.className = "card";

          // Add data attributes for search filtering
          card.setAttribute("data-title", item.title.toLowerCase());
          card.setAttribute("data-type", item.type.toLowerCase());
          card.setAttribute("data-notes", item.notes.toLowerCase());
          card.setAttribute("data-link", item.link.toLowerCase());
          card.setAttribute("data-week", weekLabel.toLowerCase());

          card.innerHTML = `
            <img src="${item.image}" alt="${item.title}" class="thumb">
            <div class="card-meta">
              <div class="card-sub">${item.type}</div>
              <div class="card-title">${item.title}</div>
              ${item.notes ? `<div class="card-notes">${item.notes}</div>` : ""}
            </div>
          `;

          if (item.link) {
            card.addEventListener("click", () => {
              window.open(item.link, "_blank");
            });
          }

          grid.appendChild(card);
        });

        weekBlock.appendChild(grid);
        feed.appendChild(weekBlock);
      });

      console.log(`[Weekly Feed] Feed created with ${validItems.length} items`);
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
              const week = card.getAttribute("data-week") || "";

              const matches =
                title.includes(query) ||
                type.includes(query) ||
                notes.includes(query) ||
                link.includes(query) ||
                week.includes(query);

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
