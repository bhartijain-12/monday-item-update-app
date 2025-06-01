let currentItemId = null;
let currentColumns = [];
let currentBoardId = null;
let users = [];
let statusLabels = {};

// Search for an item by ID, load data and metadata, then render form
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

      // Determine if users or status labels are needed
      let needUsers = false;
      let needStatusLabels = false;

      for (const col of currentColumns) {
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

      renderItemForm();
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


function renderItemForm() {
  let html = "";

  currentColumns.forEach((col) => {
    const safeText = col.text ? col.text.replace(/"/g, "&quot;") : "";

    html += `
      <div style="margin-bottom:8px;width:50%">
        <label><strong>${col.column.title}</strong>:</label>
    `;

    if (col.type === "people") {
      html += `
        <select data-column="${
          col.id
        }" data-original="${safeText}" style="width:300px;">
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
        }" data-original="${safeText}" style="width:300px;">
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
        <input type="text" value="${safeText}" data-column="${col.id}" data-original="${safeText}" style="width:300px;" />
      `;
    }

    html += `</div>`;
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