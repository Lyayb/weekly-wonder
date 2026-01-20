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

      // Collect ALL valid items (no limit - load all weeks)
      const validItems = [];

      dataRows.forEach((row, index) => {
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

      // Sort weeks by date (most recent first)
      const sortedWeeks = Object.keys(weekGroups).sort((a, b) => {
        const dateA = weekGroups[a].date;
        const dateB = weekGroups[b].date;
        // Parse dates in YYYY-MM-DD format and sort descending (newest first)
        return new Date(dateB) - new Date(dateA);
      });

      console.log(`[Weekly Feed] Sorted weeks (newest first):`, sortedWeeks);

      // Wrap all weeks in a scrollable container
      const weeksContainer = document.createElement("div");
      weeksContainer.className = "weeks-container";
      weeksContainer.id = "weeksContainer";

      sortedWeeks.forEach((weekLabel, weekIndex) => {
        const weekData = weekGroups[weekLabel];

        console.log(`[Weekly Feed] Processing week: ${weekLabel}, items: ${weekData.items.length}`);

        const weekBlock = document.createElement("div");
        weekBlock.className = "week-block";
        weekBlock.setAttribute("data-week-index", weekIndex);

        const label = document.createElement("h2");
        label.className = "week-label";
        // Format: "Week 01.08.2026" or just week label if no date
        label.textContent = weekData.date ? `Week ${weekData.date}` : weekLabel;
        weekBlock.appendChild(label);

        const grid = document.createElement("div");
        grid.className = "week-grid";

        // Add ALL items for this week (no card limit)
        weekData.items.forEach((item) => {
          console.log(`[Weekly Feed] Creating card: ${item.title}`);
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
        weeksContainer.appendChild(weekBlock);
      });

      // Add navigation arrows
      const navLeft = document.createElement("button");
      navLeft.className = "week-nav week-nav-left";
      navLeft.innerHTML = "←";
      navLeft.setAttribute("aria-label", "Previous week");

      const navRight = document.createElement("button");
      navRight.className = "week-nav week-nav-right";
      navRight.innerHTML = "→";
      navRight.setAttribute("aria-label", "Next week");

      // Add everything to feed
      feed.appendChild(navLeft);
      feed.appendChild(weeksContainer);
      feed.appendChild(navRight);

      console.log(`[Weekly Feed] Feed created with ${validItems.length} items across ${sortedWeeks.length} weeks`);

      // Initialize week navigation
      let currentWeekIndex = 0; // Start at most recent week (index 0)
      const totalWeeks = sortedWeeks.length;

      function showWeek(index) {
        const weekBlocks = weeksContainer.querySelectorAll(".week-block");
        weekBlocks.forEach((block, i) => {
          block.style.display = i === index ? "block" : "none";
        });

        // Update navigation button states
        navLeft.style.opacity = index > 0 ? "1" : "0.3";
        navLeft.style.pointerEvents = index > 0 ? "auto" : "none";
        navRight.style.opacity = index < totalWeeks - 1 ? "1" : "0.3";
        navRight.style.pointerEvents = index < totalWeeks - 1 ? "auto" : "none";

        currentWeekIndex = index;
        console.log(`[Weekly Feed] Showing week ${index + 1}/${totalWeeks}: ${sortedWeeks[index]}`);
      }

      // Navigation button handlers
      navLeft.addEventListener("click", () => {
        if (currentWeekIndex > 0) {
          showWeek(currentWeekIndex - 1);
        }
      });

      navRight.addEventListener("click", () => {
        if (currentWeekIndex < totalWeeks - 1) {
          showWeek(currentWeekIndex + 1);
        }
      });

      // Touch/swipe support - only on week labels and container (not cards)
      let touchStartX = 0;
      let touchEndX = 0;
      let touchStartY = 0;
      let touchEndY = 0;
      let isSwipeGesture = false;

      // Add swipe detection to week labels and container, but NOT the grid
      function addSwipeListeners(element) {
        element.addEventListener("touchstart", (e) => {
          // Don't interfere if touching the scrollable grid
          if (e.target.closest('.week-grid')) {
            return;
          }

          touchStartX = e.changedTouches[0].screenX;
          touchStartY = e.changedTouches[0].screenY;
          isSwipeGesture = true;
        });

        element.addEventListener("touchmove", (e) => {
          if (!isSwipeGesture || e.target.closest('.week-grid')) {
            return;
          }

          // Check if this is more horizontal than vertical
          const currentX = e.changedTouches[0].screenX;
          const currentY = e.changedTouches[0].screenY;
          const diffX = Math.abs(currentX - touchStartX);
          const diffY = Math.abs(currentY - touchStartY);

          // If moving more vertically, cancel the swipe
          if (diffY > diffX) {
            isSwipeGesture = false;
          }
        });

        element.addEventListener("touchend", (e) => {
          if (!isSwipeGesture || e.target.closest('.week-grid')) {
            isSwipeGesture = false;
            return;
          }

          touchEndX = e.changedTouches[0].screenX;
          touchEndY = e.changedTouches[0].screenY;
          handleSwipe();
          isSwipeGesture = false;
        });
      }

      function handleSwipe() {
        const swipeThreshold = 100; // Increased threshold for more deliberate swipes
        const diff = touchStartX - touchEndX;
        const verticalDiff = Math.abs(touchStartY - touchEndY);

        // Only trigger if horizontal swipe is dominant
        if (Math.abs(diff) > swipeThreshold && verticalDiff < 50) {
          if (diff > 0) {
            // Swiped left - show next week
            if (currentWeekIndex < totalWeeks - 1) {
              showWeek(currentWeekIndex + 1);
            }
          } else {
            // Swiped right - show previous week
            if (currentWeekIndex > 0) {
              showWeek(currentWeekIndex - 1);
            }
          }
        }
      }

      // Apply swipe listeners to week labels only
      weeksContainer.querySelectorAll('.week-label').forEach(addSwipeListeners);

      // Also add to the container background areas (but grid will be excluded)
      addSwipeListeners(weeksContainer);

      // Show the most recent week (index 0) by default
      showWeek(0);

      console.log("[Weekly Feed] loaded safely with week navigation");

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
