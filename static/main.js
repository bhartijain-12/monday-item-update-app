const monday = window.mondaySdk();
let currentItemId = null;
let currentColumns = [];
let currentBoardId = null;
let users = [];
let statusLabels = {};

// Automatically initialize on page load
window.addEventListener("DOMContentLoaded", initialize);


//this function fetch the data of a board according to region
async function get_column_data(region, boardId, itemId, columnIds) {
  console.log('get_column_data for----->',region);

  try {
    const response = await fetch("/get_columnData", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
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

    //get the values from a columns 
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

//this funtion handles the rendering of top growing regions
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
        li.innerHTML = `<span class="highlight">${regionName}</span> ↑ ${growth} due to ${reason}`;
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

//this funtion handles the rendering of negative insights
function renderNegativeInsights(region, text) {
  const list = document.querySelector(`#${region}NegativeList`);
  if (!list) return;

  list.innerHTML = "";

  const points = text.split("\n").filter(line =>
    line.trim().startsWith("-") || line.trim().match(/^[••*]/)
  );

  points.forEach(point => {
    const li = document.createElement("li");
    li.textContent = point.replace(/^[-•*]\s*/, "").trim();
    list.appendChild(li);
  });
}

//this funtion parse the json for chart data and pass to the all chart fucntions according to chart type
function renderChartsFromText(region, text) {
  const parsedCharts = parseMultiJSON(text);

  parsedCharts.forEach(chart => {
    if (chart.age_group_purchases) {
      renderBarChart(`${region}AgeChart`, chart.age_group_purchases);
    } else if (chart.area_type_purchases) {
      renderPieChart(`${region}AreaChart`, chart.area_type_purchases);
    } else if (chart.satisfactory_score) {
      renderDoughnutChart(`${region}SatisfactionChart`, chart.satisfactory_score);
    } else if (chart.lead_source_purchases) {
      renderBarChart(`${region}LeadSourceChart`, chart.lead_source_purchases);
    }
  });
}


//render charts functions
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


function parseMultiJSON(raw) {   // Wrap in brackets and separate objects with commas
  const fixed = "[" + raw.trim().replace(/}\s*{/g, "}, {") + "]";
  try {
    return JSON.parse(fixed);
  } catch (err) {
    console.error("Could not parse chart data:", err);
    return [];
  }
}




// New: initialize function to set up context and trigger search
function initialize() {
  monday.get("context").then((res) => {
    console.log("Full context:", res);

    const itemId = res.data.itemId;
    const boardId = res.data.boardId;

    if (itemId && boardId) {
      currentItemId = itemId;
      currentBoardId = boardId;

      // Optional: set hidden field, in case it's used somewhere
      //document.getElementById("item-id").value = itemId;

      //  Auto trigger search
      searchItem();
      console.log("Calling searchItem with itemId:", currentItemId);

    } else {
      alert("Failed to load item context.");
    }
  });
}

// 🔍 Load item data and render the form
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
      currentColumns = item.column_values.filter(
        (col) => col.type !== "subtasks"
      );
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

//  Fetch status labels for the board
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
          </select>`;
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
          </select>`;
      } else {
        html += `<input type="text" value="${safeText}" data-column="${col.id}" data-original="${safeText}" style="${inputStyle}" />`;
      }

      html += `</div>`;
    });

    html += `</div></div>`;
  });

  document.getElementById("item-details").innerHTML = html;
}

// 🧹 Clear form content
function clearForm() {
  document.getElementById("item-details").innerHTML = "";
  document.getElementById("save-btn").style.display = "none";
}

// 💾 Save changes to server
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

// const monday = window.mondaySdk();
// let currentItemId = null;
// let currentColumns = [];
// let currentBoardId = null;
// let users = [];
// let statusLabels = {};

// monday.get("context").then((res) => {
//   console.log("Full context:", res);

//   const itemId = res.data.itemId;
//   const boardId = res.data.boardId;

//   if (itemId && boardId) {
//     document.getElementById("item-id").value = itemId; // Set the hidden field
//     searchItem(); // Automatically search
//   } else {
//     alert("Failed to load item context.");
//   }
// });
// // Search for an item by ID, load data and metadata, then render form with sections
// async function searchItem() {
//   const itemId = document.getElementById("item-id").value.trim();
//   if (!itemId) {
//     alert("Please enter an Item ID");
//     return;
//   }

//   try {
//     const response = await fetch("/get_item", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ item_id: itemId }),
//     });
//     const data = await response.json();

//     if (data.data && data.data.items && data.data.items.length > 0) {
//       const item = data.data.items[0];

//       currentItemId = itemId;
//       currentColumns = item.column_values;
//       // Exclude subtasks columns if any
//       currentColumns = currentColumns.filter((col) => col.type !== "subtasks");
//       currentBoardId = item.board.id;
//       const boardName = item.board.name;

//       // Fetch section and allowed columns config for the board
//       const configResponse = await fetch("/get_column_config", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ board_name: boardName }),
//       });
//       const configData = await configResponse.json();
//       const sections = configData.sections || [];

//       // Group currentColumns by section, filtering by allowed columns per section
//       const columnsBySection = {};
//       sections.forEach(({ section_name, allowed_columns }) => {
//         columnsBySection[section_name] = currentColumns.filter((col) =>
//           allowed_columns.includes(col.column.title)
//         );
//       });

//       // Flatten columns across all sections to check for user/status types
//       const allFilteredColumns = Object.values(columnsBySection).flat();

//       // Determine if users or status labels are needed
//       let needUsers = false;
//       let needStatusLabels = false;

//       for (const col of allFilteredColumns) {
//         if (col.type === "people") needUsers = true;
//         if (col.type === "status") needStatusLabels = true;
//       }

//       if (needUsers) {
//         await getUsers();
//       }

//       if (needStatusLabels) {
//         await getStatusLabels(currentBoardId);
//       } else {
//         statusLabels = {}; // Clear if not needed
//       }

//       // Render form with sections and columns grouped
//       renderItemForm(columnsBySection, sections);
//       document.getElementById("save-btn").style.display = "inline-block";
//     } else {
//       alert("Item not found.");
//       clearForm();
//     }
//   } catch (err) {
//     console.error("Error fetching item:", err);
//     alert("Failed to fetch item.");
//     clearForm();
//   }
// }

// // Fetch users from server
// async function getUsers() {
//   try {
//     const response = await fetch("/users", { method: "GET" });
//     users = await response.json();
//   } catch (err) {
//     console.error("Failed to fetch users:", err);
//     users = [];
//   }
// }

// // Fetch status labels from server for the given board
// async function getStatusLabels(boardId) {
//   try {
//     const response = await fetch("/get_status_labels", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ board_id: boardId }),
//     });
//     statusLabels = await response.json();
//   } catch (err) {
//     console.error("Failed to fetch status labels:", err);
//     statusLabels = {};
//   }
// }

// // Render the form with sections in backend order
// function renderItemForm(columnsBySection, sections) {
//   let html = "";

//   // Use sections order from backend directly
//   sections.forEach(({ section_name }) => {
//     const cols = columnsBySection[section_name];
//     if (!cols) return; // skip if no columns for section

//     html += `<div class="section-container">`;
//     html += `<h3 style="margin-top: 24px;" class="section-title">${section_name}</h3>`;
//     html += `<div style="display: flex; flex-wrap: wrap; gap: 16px;">`;

//     cols.forEach((col) => {
//       const safeText = col.text ? col.text.replace(/"/g, "&quot;") : "";

//       html += `<div style="flex: 1 1 48%; min-width: 250px;">`;
//       html += `<label style="display:block; margin-bottom: 2px;"><strong>${col.column.title}</strong></label>`;

//       const inputStyle = `width: 400px; padding: 4px; box-sizing: border-box;`;

//       if (col.type === "people") {
//         html += `
//           <select data-column="${
//             col.id
//           }" data-original="${safeText}" style="${inputStyle}">
//             ${users
//               .map(
//                 (user) => `
//               <option value="${user.id}" ${
//                   user.name === col.text ? "selected" : ""
//                 }>${user.name}</option>
//             `
//               )
//               .join("")}
//           </select>
//         `;
//       } else if (col.type === "status" && statusLabels[col.id]) {
//         const labels = statusLabels[col.id].labels;

//         html += `
//           <select data-column="${
//             col.id
//           }" data-original="${safeText}" style="${inputStyle}">
//             ${Object.entries(labels)
//               .map(
//                 ([key, label]) => `
//               <option value="${label}" ${
//                   col.text === label ? "selected" : ""
//                 }>${label}</option>
//             `
//               )
//               .join("")}
//           </select>
//         `;
//       } else {
//         html += `
//           <input type="text" value="${safeText}" data-column="${col.id}" data-original="${safeText}" style="${inputStyle}" />
//         `;
//       }

//       html += `</div>`;
//     });

//     html += `</div>`;
//     html += `</div>`;
//   });

//   document.getElementById("item-details").innerHTML = html;
// }

// // Clear the form and hide save button
// function clearForm() {
//   document.getElementById("item-details").innerHTML = "";
//   document.getElementById("save-btn").style.display = "none";
// }

// // Save the updated item values to the server
// function saveItem() {
//   if (!currentItemId) {
//     alert("No item loaded.");
//     return;
//   }

//   const container = document.getElementById("item-details");
//   const inputs = container.querySelectorAll("input, select");

//   const updates = Array.from(inputs)
//     .filter((input) => input.value !== input.dataset.original)
//     .map((input) => {
//       const columnId = input.dataset.column;
//       const column = currentColumns.find((col) => col.id === columnId);

//       return {
//         id: columnId,
//         value: input.value,
//         type: column?.type || null,
//       };
//     });

//   if (updates.length === 0) {
//     alert("No changes detected.");
//     return;
//   }

//   console.log("Updates to save:", updates);

//   fetch("/update_item", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({
//       item_id: currentItemId,
//       updates: updates,
//       board_id: currentBoardId,
//     }),
//   })
//     .then((res) => res.json())
//     .then((data) => {
//       console.log("Update response:", data);
//       alert("Item updated successfully!");
//       searchItem(); // Refresh form after save
//     })
//     .catch((err) => {
//       console.error("Error updating item:", err);
//       alert("Failed to update item.");
//     });
// }
// window.addEventListener("DOMContentLoaded", initialize);

// let currentItemId = null;
// let currentColumns = [];
// let currentBoardId = null;
// let users = [];
// let statusLabels = {};

// // Search for an item by ID, load data and metadata, then render form with sections
// async function searchItem() {
//   const itemId = document.getElementById("item-id").value.trim();
//   if (!itemId) {
//     alert("Please enter an Item ID");
//     return;
//   }

//   try {
//     const response = await fetch("/get_item", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ item_id: itemId }),
//     });
//     const data = await response.json();

//     if (data.data && data.data.items && data.data.items.length > 0) {
//       const item = data.data.items[0];

//       currentItemId = itemId;
//       currentColumns = item.column_values;
//       currentColumns = currentColumns.filter((col) => col.type !== "subtasks");
//       currentBoardId = item.board.id;
//       const boardName = item.board.name;

//       // Fetch section and allowed columns config for the board
//       const configResponse = await fetch("/get_column_config", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ board_name: boardName }),
//       });
//       const configData = await configResponse.json();
//       const sections = configData.sections || [];

//       // Group currentColumns by section, filtering by allowed columns per section
//       const columnsBySection = {};
//       sections.forEach(({ section_name, allowed_columns }) => {
//         columnsBySection[section_name] = currentColumns.filter((col) =>
//           allowed_columns.includes(col.column.title)
//         );
//       });

//       // Flatten columns across all sections to check for user/status types
//       const allFilteredColumns = Object.values(columnsBySection).flat();

//       // Determine if users or status labels are needed
//       let needUsers = false;
//       let needStatusLabels = false;

//       for (const col of allFilteredColumns) {
//         if (col.type === "people") needUsers = true;
//         if (col.type === "status") needStatusLabels = true;
//       }

//       if (needUsers) {
//         await getUsers();
//       }

//       if (needStatusLabels) {
//         await getStatusLabels(currentBoardId);
//       } else {
//         statusLabels = {}; // Clear if not needed
//       }

//       // Render form with sections and columns grouped
//       renderItemForm(columnsBySection);
//       document.getElementById("save-btn").style.display = "inline-block";
//     } else {
//       alert("Item not found.");
//       clearForm();
//     }
//   } catch (err) {
//     console.error("Error fetching item:", err);
//     alert("Failed to fetch item.");
//     clearForm();
//   }
// }

// // Fetch users from server
// async function getUsers() {
//   try {
//     const response = await fetch("/users", { method: "GET" });
//     users = await response.json();
//   } catch (err) {
//     console.error("Failed to fetch users:", err);
//     users = [];
//   }
// }

// // Fetch status labels from server for the given board
// async function getStatusLabels(boardId) {
//   try {
//     const response = await fetch("/get_status_labels", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ board_id: boardId }),
//     });
//     statusLabels = await response.json();
//   } catch (err) {
//     console.error("Failed to fetch status labels:", err);
//     statusLabels = {};
//   }
// }

// function renderItemForm(columnsBySection) {
//   let html = "";

//   // Sort section names alphabetically
//   const sortedSections = Object.keys(columnsBySection).sort((a, b) =>
//     a.toLowerCase().localeCompare(b.toLowerCase())
//   );

//   sortedSections.forEach((sectionName) => {
//     const cols = columnsBySection[sectionName];
//     html += `<div class="section-container">`;
//     html += `<h3 style="margin-top: 24px; " class="section-title">${sectionName}</h3>`;

//     // Wrap all section fields in a flex container to create rows
//     html += `<div style="display: flex; flex-wrap: wrap; gap: 16px;">`;

//     cols.forEach((col) => {
//       const safeText = col.text ? col.text.replace(/"/g, "&quot;") : "";

//       html += `<div style="flex: 1 1 48%; min-width: 250px;">`;
//       // html += `<label><strong>${col.column.title}</strong>:</label><br/>`;
//       html += `<label style="display:block; margin-bottom: 2px;"><strong>${col.column.title}</strong></label>`;

//       const inputStyle = `width: 400px; padding: 4px; box-sizing: border-box;`;

//       if (col.type === "people") {
//         html += `
//           <select data-column="${
//             col.id
//           }" data-original="${safeText}" style="${inputStyle}">
//             ${users
//               .map(
//                 (user) => `
//               <option value="${user.id}" ${
//                   user.name === col.text ? "selected" : ""
//                 }>${user.name}</option>
//             `
//               )
//               .join("")}
//           </select>
//         `;
//       } else if (col.type === "status" && statusLabels[col.id]) {
//         const labels = statusLabels[col.id].labels;

//         html += `
//           <select data-column="${
//             col.id
//           }" data-original="${safeText}" style="${inputStyle}">
//             ${Object.entries(labels)
//               .map(
//                 ([key, label]) => `
//               <option value="${label}" ${
//                   col.text === label ? "selected" : ""
//                 }>${label}</option>
//             `
//               )
//               .join("")}
//           </select>
//         `;
//       } else {
//         html += `
//           <input type="text" value="${safeText}" data-column="${col.id}" data-original="${safeText}" style="${inputStyle}" />
//         `;
//       }

//       html += `</div>`;
//     });

//     html += `</div>`;
//     html += `</div>`; // close flex container for section fields
//   });

//   document.getElementById("item-details").innerHTML = html;
// }

// // Clear the form and hide save button
// function clearForm() {
//   document.getElementById("item-details").innerHTML = "";
//   document.getElementById("save-btn").style.display = "none";
// }

// // Save the updated item values to the server
// function saveItem() {
//   if (!currentItemId) {
//     alert("No item loaded.");
//     return;
//   }

//   const container = document.getElementById("item-details");
//   const inputs = container.querySelectorAll("input, select");

//   const updates = Array.from(inputs)
//     .filter((input) => input.value !== input.dataset.original)
//     .map((input) => {
//       const columnId = input.dataset.column;
//       const column = currentColumns.find((col) => col.id === columnId);

//       return {
//         id: columnId,
//         value: input.value,
//         type: column?.type || null,
//       };
//     });

//   if (updates.length === 0) {
//     alert("No changes detected.");
//     return;
//   }

//   console.log("Updates to save:", updates);

//   fetch("/update_item", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({
//       item_id: currentItemId,
//       updates: updates,
//       board_id: currentBoardId,
//     }),
//   })
//     .then((res) => res.json())
//     .then((data) => {
//       console.log("Update response:", data);
//       alert("Item updated successfully!");
//       searchItem(); // Refresh form after save
//     })
//     .catch((err) => {
//       console.error("Error updating item:", err);
//       alert("Failed to update item.");
//     });
// }

// document.addEventListener("DOMContentLoaded", async function () {
//   const monday = window.mondaySdk();

//   monday.get("itemId").then((res) => {
//     const itemId = res.data;
//     if (itemId) {
//       document.getElementById("item-id").value = itemId; // not shown now, but still useful
//       searchItem(itemId);
//     } else {
//       alert("Could not load item ID from context.");
//     }
//   });
// });

// let currentItemId = null;
// let currentColumns = [];
// let currentBoardId = null;
// let users = [];
// let statusLabels = {};

// // Search for an item by ID, load data and metadata, then render form with sections
// // async function searchItem() {
// //   const itemId = document.getElementById("item-id").value.trim();
// //   if (!itemId) {
// //     alert("Please enter an Item ID");
// //     return;
// //   }
// async function searchItem(providedItemId) {
//   const itemId = providedItemId || document.getElementById("item-id").value.trim();
//   if (!itemId) {
//     alert("Please enter an Item ID");
//     return;
//   }

// async function searchItem() {
//   const itemId = document.getElementById("item-id").value.trim();
//   if (!itemId) {
//     alert("Please enter an Item ID");
//     return;
//   }

//   try {
//     // Fetch item with columns and board info
//     const response = await fetch("/get_item", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ item_id: itemId }),
//     });
//     const data = await response.json();

//     if (data.data && data.data.items && data.data.items.length > 0) {
//       const item = data.data.items[0];

//       currentItemId = itemId;
//       currentColumns = item.column_values;
//       currentColumns = currentColumns.filter((col) => col.type !== "subtasks");
//       currentBoardId = item.board.id;
//       const boardName = item.board.name;

//       // Fetch section and column config from master board
//       const configResponse = await fetch("/get_sections_columns", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ board_name: boardName }),
//       });
//       const configData = await configResponse.json();
//       const sections = configData.sections || [];

//       // Now we want to render each section with only columns that are defined in that section.
//       // For each section, filter currentColumns by matching column.title with section column title

//       const columnsBySection = {};

//       sections.forEach(({ section_name, columns }) => {
//         // Filter current item columns by titles defined in this section.columns
//         const allowedTitles = columns.map((c) => c.title);

//         const filteredCols = currentColumns.filter((col) =>
//           allowedTitles.includes(col.column.title)
//         );

//         // Sort filteredCols by the same order as in section.columns
//         filteredCols.sort((a, b) => {
//           const aIndex = allowedTitles.indexOf(a.column.title);
//           const bIndex = allowedTitles.indexOf(b.column.title);
//           return aIndex - bIndex;
//         });

//         columnsBySection[section_name] = filteredCols;
//       });

//       // Determine if users or status labels are needed
//       const allFilteredColumns = Object.values(columnsBySection).flat();
//       let needUsers = false;
//       let needStatusLabels = false;
//       for (const col of allFilteredColumns) {
//         if (col.type === "people") needUsers = true;
//         if (col.type === "status") needStatusLabels = true;
//       }
//       if (needUsers) await getUsers();
//       if (needStatusLabels) await getStatusLabels(currentBoardId);
//       else statusLabels = {};

//       // Render form
//       renderItemForm(columnsBySection);
//       document.getElementById("save-btn").style.display = "inline-block";
//     } else {
//       alert("Item not found.");
//       clearForm();
//     }
//   } catch (err) {
//     console.error("Error fetching item:", err);
//     alert("Failed to fetch item.");
//     clearForm();
//   }
// }
