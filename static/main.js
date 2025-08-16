const monday = window.mondaySdk();
let currentItemId = null;
let currentColumns = [];
let currentBoardId = null;
let users = [];
let statusLabels = {};

// Automatically initialize on page load
window.addEventListener("DOMContentLoaded", initialize);

// fetch board data for a region
async function get_column_data(region, boardId, itemId, columnIds) {
  console.log('get_column_data for----->',region);

  try {
    const response = await fetch("/get_columnData", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        board_id: boardId,
        item_id: itemId,
        column_ids: columnIds
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Column data received for ${region}:`, data);

    const columnValues = data.column_values;
    const summaryCol = columnValues.find(c => c.column.title.includes("Insight Summary"));
    const negativeInsightCol = columnValues.find(c => c.column.title.includes("Negative Insights"));
    const dataInsightCol = columnValues.find(c => c.column.title.includes("Data Insight"));

    if (summaryCol?.text) {
      renderTopGrowingRegions(region, summaryCol.text);
    }

    if (dataInsightCol?.text) {
      renderChartsFromText(region, dataInsightCol.text);
    }

    if (negativeInsightCol?.text) {
      renderNegativeInsights(region, negativeInsightCol.text);
    }

  } catch (error) {
    console.error(`Error fetching data for ${region}:`, error);
  }
}

// Render summary sections
function renderTopGrowingRegions(region, summaryText) {
  const topList = document.getElementById(`${region}TopGrowingList`);
  const keyDriversList = document.getElementById(`${region}KeyDriversList`);
  const actionableList = document.getElementById(`${region}ActionableList`);

  topList.innerHTML = "";
  keyDriversList.innerHTML = "";
  actionableList.innerHTML = "";

  const lines = summaryText.split("\n");
  let section = null;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("1.")) {
      section = "top";
      continue;
    } else if (trimmed.startsWith("2.")) {
      section = "drivers";
      continue;
    } else if (trimmed.startsWith("3.")) {
      section = "actionable";
      continue;
    }

    if (trimmed.startsWith("-")) {
      const li = document.createElement("li");

      const match = trimmed.match(/- Region:\s*(.*?)\s*↑\s*(.*?)\s*due to(.*)/);
      if (match) {
        const regionName = match[1].trim();
        const growth = match[2].trim();
        const reason = match[3].trim();
        li.innerHTML = `<span class="highlight">${regionName}</span> ↑ ${growth} due to ${reason}`;
      } else {
        li.textContent = trimmed.replace("- ", "").trim();
      }

      if (section === "top") {
        topList.appendChild(li);
      } else if (section === "drivers") {
        keyDriversList.appendChild(li);
      } else if (section === "actionable") {
        actionableList.appendChild(li);
      }
    }
  }
}

// Render negative insights + generate actions
function renderNegativeInsights(region, text) {
  const list = document.querySelector(`#${region}NegativeList`);
  const actionList = document.querySelector(`#${region}ActionableList`);
  if (!list || !actionList) return;

  list.innerHTML = "";
  actionList.innerHTML = "";

  const points = text.split("\n").filter(line =>
    line.trim().startsWith("-") || line.trim().match(/^[••*]/)
  );

  const foundActions = new Set();

  points.forEach(point => {
    const cleanPoint = point.replace(/^[-•*]\s*/, "").trim();
    const li = document.createElement("li");
    li.textContent = cleanPoint;
    list.appendChild(li);

    // Map negative insights to actions
    if (/quality|defect|broken|damaged/i.test(cleanPoint)) {
      foundActions.add("apology_email");
    }
    if (/discount|price|expensive|cost|coupon/i.test(cleanPoint)) {
      foundActions.add("generate_coupon");
    }
    if (/delivery|support|service|delay|late|ticket|case|return/i.test(cleanPoint)) {
      foundActions.add("create_task");
    }
  });

  // Render action buttons
  foundActions.forEach(actionType => {
    let label = "";
    if (actionType === "apology_email") label = "Send Apology Email for bad product quality";
    if (actionType === "generate_coupon") label = "Generate Coupon Code";
    if (actionType === "create_task") label = "Create Service Support Task in Monday";

    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.className = "action-btn";
    btn.textContent = label;
    btn.addEventListener("click", () => triggerAction(actionType, region, Array.from(points).join("\n")));
    li.appendChild(btn);
    actionList.appendChild(li);
  });
}

async function triggerAction(type, region, insightText) {
  try {
    const payload = {
      type,
      region,
      board_id: currentBoardId,
      item_id: currentItemId,
      insight: insightText || ""
    };
    const response = await fetch("/trigger_action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    alert(data.message || "Action completed");
  } catch (err) {
    console.error("Error triggering action:", err);
    alert("Failed to trigger action.");
  }
}

// Parse chart JSON
function renderChartsFromText(region, text) {
  const parsedCharts = parseMultiJSON(text);
  parsedCharts.forEach(chart => {
    if (chart.age_group_purchases) {
      renderBarChart(`${region}AgeChart`, chart.age_group_purchases);
    } else if (chart.area_type_purchases) {
      renderPieChart(`${region}AreaChart`, chart.area_type_purchases);
    } else if (chart["Satisfactory Score"]) {
      renderDoughnutChart(`${region}SatisfactionChart`, chart["Satisfactory Score"]);
    }
    else if (chart["Lead Source"]) {
      renderBarChart(`${region}LeadSourceChart`, chart["Lead Source"]);
    }
  });
}

// render charts
function renderBarChart(canvasId, dataObj) {
  const labels = Object.keys(dataObj);
  const values = Object.values(dataObj);

  new Chart(document.getElementById(canvasId), {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: "Value",
        data: values,
        backgroundColor: "#2a9d8f"
      }]
    },
    options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
  });
}

function renderPieChart(canvasId, dataObj) {
  new Chart(document.getElementById(canvasId), {
    type: 'pie',
    data: {
      labels: Object.keys(dataObj),
      datasets: [{
        data: Object.values(dataObj),
        backgroundColor: ["#264653", "#2a9d8f", "#e76f51"]
      }]
    }
  });
}

function renderDoughnutChart(canvasId, dataObj) {
  new Chart(document.getElementById(canvasId), {
    type: 'doughnut',
    data: {
      labels: Object.keys(dataObj),
      datasets: [{
        data: Object.values(dataObj),
        backgroundColor: ["#2a9d8f", "#e9c46a", "#e76f51"]
      }]
    }
  });
}

function parseMultiJSON(raw) {
  const fixed = "[" + raw.trim().replace(/}\s*{/g, "}, {") + "]";
  try {
    return JSON.parse(fixed);
  } catch (err) {
    console.error("Could not parse chart data:", err);
    return [];
  }
}

// initialize context and load item
function initialize() {
  monday.get("context").then((res) => {
    console.log("Full context:", res);

    const itemId = res.data.itemId;
    const boardId = res.data.boardId;

    if (itemId && boardId) {
      currentItemId = itemId;
      currentBoardId = boardId;
      searchItem();
      console.log("Calling searchItem with itemId:", currentItemId);
    } else {
      alert("Failed to load item context.");
    }
  });
}

// Load item data and render the form
async function searchItem() {
  if (!currentItemId) {
    alert("No item ID found.");
    return;
  }

  try {
    const response = await fetch("/get_item", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item_id: currentItemId }),
    });
    const data = await response.json();

    if (data.data && data.data.items && data.data.items.length > 0) {
      const item = data.data.items[0];
      currentColumns = item.column_values.filter((col) => col.type !== "subtasks");
      const boardName = item.board.name;

      const configResponse = await fetch("/get_column_config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ board_name: boardName }),
      });

      const configData = await configResponse.json();
      const sections = configData.sections || [];

      const columnsBySection = {};
      sections.forEach(({ section_name, allowed_columns }) => {
        columnsBySection[section_name] = currentColumns.filter((col) =>
          allowed_columns.includes(col.column.title)
        );
      });

      const allFilteredColumns = Object.values(columnsBySection).flat();
      let needUsers = false;
      let needStatusLabels = false;

      for (const col of allFilteredColumns) {
        if (col.type === "people") needUsers = true;
        if (col.type === "status") needStatusLabels = true;
      }

      if (needUsers) await getUsers();
      if (needStatusLabels) await getStatusLabels(currentBoardId);
      else statusLabels = {};

      renderItemForm(columnsBySection, sections);
      document.getElementById("save-btn")?.style && (document.getElementById("save-btn").style.display = "inline-block");
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

// Fetch users from backend
async function getUsers() {
  try {
    const response = await fetch("/users", { method: "GET" });
    users = await response.json();
  } catch (err) {
    console.error("Failed to fetch users:", err);
    users = [];
  }
}

// Fetch status labels for the board
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

// Render input fields grouped by section
function renderItemForm(columnsBySection, sections) {
  let html = "";

  sections.forEach(({ section_name }) => {
    const cols = columnsBySection[section_name];
    if (!cols) return;

    html += `<div class="section-container">`;
    html += `<h3 style="margin-top: 24px;" class="section-title">${section_name}</h3>`;
    html += `<div style="display: flex; flex-wrap: wrap; gap: 16px;">`;

    cols.forEach((col) => {
      const safeText = col.text ? col.text.replace(/"/g, "&quot;") : "";
      html += `<div style="flex: 1 1 48%; min-width: 250px;">`;
      html += `<label style="display:block; margin-bottom: 2px;"><strong>${col.column.title}</strong></label>`;
      const inputStyle = `width: 250px; padding: 4px; box-sizing: border-box;`;

      if (col.type === "people") {
        html += `
          <select data-column="${col.id}" data-original="${safeText}" style="${inputStyle}">
            ${users.map((user) => `
              <option value="${user.id}" ${user.name === col.text ? "selected" : ""}>${user.name}</option>
            `).join("")}
          </select>`;
      } else if (col.type === "status" && statusLabels[col.id]) {
        const labels = statusLabels[col.id].labels;
        html += `
          <select data-column="${col.id}" data-original="${safeText}" style="${inputStyle}">
            ${Object.entries(labels).map(([key, label]) => `
              <option value="${label}" ${col.text === label ? "selected" : ""}>${label}</option>
            `).join("")}
          </select>`;
      } else {
        html += `<input type="text" value="${safeText}" data-column="${col.id}" data-original="${safeText}" style="${inputStyle}" />`;
      }

      html += `</div>`;
    });

    html += `</div></div>`;
  });

  const container = document.getElementById("item-details");
  if (container) container.innerHTML = html;
}

// Clear form content
function clearForm() {
  const container = document.getElementById("item-details");
  if (container) container.innerHTML = "";
  const btn = document.getElementById("save-btn");
  if (btn) btn.style.display = "none";
}

// Save changes to server
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
      searchItem(); // Refresh data
    })
    .catch((err) => {
      console.error("Error updating item:", err);
      alert("Failed to update item.");
    });
}
