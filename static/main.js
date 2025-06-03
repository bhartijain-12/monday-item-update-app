let currentItemId = null;
let currentColumns = [];
let currentBoardId = null;
let users = [];
let statusLabels = {};

// Search for an item by ID, load data and metadata, then render form with sections
async function searchItem() {
  const itemId = document.getElementById("item-id").value.trim();
  if (!itemId) {
    alert("Please enter an Item ID");
    return;
  }

  try {
    const response = await fetch("/get_item", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item_id: itemId }),
    });
    const data = await response.json();

    if (data.data && data.data.items && data.data.items.length > 0) {
      const item = data.data.items[0];

      currentItemId = itemId;
      currentColumns = item.column_values;
      currentColumns = currentColumns.filter((col) => col.type !== "subtasks");
      currentBoardId = item.board.id;
      const boardName = item.board.name;

      // Fetch section and allowed columns config for the board
      const configResponse = await fetch("/get_column_config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ board_name: boardName }),
      });
      const configData = await configResponse.json();
      const sections = configData.sections || [];

      // Group currentColumns by section, filtering by allowed columns per section
      const columnsBySection = {};
      sections.forEach(({ section_name, allowed_columns }) => {
        columnsBySection[section_name] = currentColumns.filter((col) =>
          allowed_columns.includes(col.column.title)
        );
      });

      // Flatten columns across all sections to check for user/status types
      const allFilteredColumns = Object.values(columnsBySection).flat();

      // Determine if users or status labels are needed
      let needUsers = false;
      let needStatusLabels = false;

      for (const col of allFilteredColumns) {
        if (col.type === "people") needUsers = true;
        if (col.type === "status") needStatusLabels = true;
      }

      if (needUsers) {
        await getUsers();
      }

      if (needStatusLabels) {
        await getStatusLabels(currentBoardId);
      } else {
        statusLabels = {}; // Clear if not needed
      }

      // Render form with sections and columns grouped
      renderItemForm(columnsBySection);
      document.getElementById("save-btn").style.display = "inline-block";
    } else {
      alert("Item not found.");
      clearForm();
    }
  } catch (err) {
    console.error("Error fetching item:", err);
    alert("Failed to fetch item.");
    clearForm();
  }
}

// Fetch users from server
async function getUsers() {
  try {
    const response = await fetch("/users", { method: "GET" });
    users = await response.json();
  } catch (err) {
    console.error("Failed to fetch users:", err);
    users = [];
  }
}

// Fetch status labels from server for the given board
async function getStatusLabels(boardId) {
  try {
    const response = await fetch("/get_status_labels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ board_id: boardId }),
    });
    statusLabels = await response.json();
  } catch (err) {
    console.error("Failed to fetch status labels:", err);
    statusLabels = {};
  }
}


function renderItemForm(columnsBySection) {
  let html = "";

  // Sort section names alphabetically
  const sortedSections = Object.keys(columnsBySection).sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );

  sortedSections.forEach((sectionName) => {
    html += `<h3 style="margin-top: 24px; " class="section-title">${sectionName}</h3>`;

    const cols = columnsBySection[sectionName];

    // Wrap all section fields in a flex container to create rows
    html += `<div style="display: flex; flex-wrap: wrap; gap: 16px;">`;

    cols.forEach((col) => {
      const safeText = col.text ? col.text.replace(/"/g, "&quot;") : "";

      html += `<div style="flex: 1 1 48%; min-width: 250px;">`;
      // html += `<label><strong>${col.column.title}</strong>:</label><br/>`;
      html += `<label style="display:block; margin-bottom: 2px;"><strong>${col.column.title}</strong></label>`;

      const inputStyle = `width: 400px; padding: 4px; box-sizing: border-box;`;

      if (col.type === "people") {
        html += `
          <select data-column="${
            col.id
          }" data-original="${safeText}" style="${inputStyle}">
            ${users
              .map(
                (user) => `
              <option value="${user.id}" ${
                  user.name === col.text ? "selected" : ""
                }>${user.name}</option>
            `
              )
              .join("")}
          </select>
        `;
      } else if (col.type === "status" && statusLabels[col.id]) {
        const labels = statusLabels[col.id].labels;

        html += `
          <select data-column="${
            col.id
          }" data-original="${safeText}" style="${inputStyle}">
            ${Object.entries(labels)
              .map(
                ([key, label]) => `
              <option value="${label}" ${
                  col.text === label ? "selected" : ""
                }>${label}</option>
            `
              )
              .join("")}
          </select>
        `;
      } else {
        html += `
          <input type="text" value="${safeText}" data-column="${col.id}" data-original="${safeText}" style="${inputStyle}" />
        `;
      }

      html += `</div>`;
    });

    html += `</div>`; // close flex container for section fields
  });

  document.getElementById("item-details").innerHTML = html;
}











// Clear the form and hide save button
function clearForm() {
  document.getElementById("item-details").innerHTML = "";
  document.getElementById("save-btn").style.display = "none";
}

// Save the updated item values to the server
function saveItem() {
  if (!currentItemId) {
    alert("No item loaded.");
    return;
  }

  const container = document.getElementById("item-details");
  const inputs = container.querySelectorAll("input, select");

  const updates = Array.from(inputs)
    .filter((input) => input.value !== input.dataset.original)
    .map((input) => {
      const columnId = input.dataset.column;
      const column = currentColumns.find((col) => col.id === columnId);

      return {
        id: columnId,
        value: input.value,
        type: column?.type || null,
      };
    });

  if (updates.length === 0) {
    alert("No changes detected.");
    return;
  }

  console.log("Updates to save:", updates);

  fetch("/update_item", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      item_id: currentItemId,
      updates: updates,
      board_id: currentBoardId,
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      console.log("Update response:", data);
      alert("Item updated successfully!");
      searchItem(); // Refresh form after save
    })
    .catch((err) => {
      console.error("Error updating item:", err);
      alert("Failed to update item.");
    });
}


