// async function searchItem() {
//   const itemId = document.getElementById("itemIdInput").value;
//   if (!itemId) {
//     alert("Please enter an Item ID.");
//     return;
//   }

//   const response = await fetch("/get-item", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ item_id: itemId }),
//   });
//   const data = await response.json();

//   if (data.errors) {
//     alert("Error fetching item. Make sure the Item ID is correct.");
//     return;
//   }

//   const items = data.data.items;
//   if (!items || items.length === 0) {
//     alert("Item not found.");
//     return;
//   }

//   const item = items[0];
//   const container = document.getElementById("columnsContainer");
//   container.innerHTML = "";

//   // Show form
//   const form = document.getElementById("itemForm");
//   form.style.display = "block";

//   // Create input for item name (special case)
//   const nameDiv = document.createElement("div");
//   nameDiv.className = "column-field";
//   nameDiv.innerHTML = `<label for="nameInput">Item Name</label><input type="text" id="nameInput" value="${item.name}" />`;
//   container.appendChild(nameDiv);

//   // Create inputs for each column
//   item.column_values.forEach((col) => {
//     const div = document.createElement("div");
//     div.className = "column-field";
//     div.innerHTML = `
//         <label for="${col.id}">${col.title}</label>
//         <input type="text" id="${col.id}" value="${col.text || ""}" />
//       `;
//     container.appendChild(div);
//   });

//   // Save the item ID on form for later use
//   form.dataset.itemId = item.id;
// }

// async function saveItem() {
//   const form = document.getElementById("itemForm");
//   const itemId = form.dataset.itemId;
//   if (!itemId) {
//     alert("No item loaded.");
//     return;
//   }

//   const updates = {};

//   // Update item name separately if changed
//   const nameInput = document.getElementById("nameInput");
//   if (nameInput) {
//     updates["name"] = JSON.stringify(nameInput.value);
//   }

//   // Get all column inputs
//   const inputs = form.querySelectorAll("input");
//   inputs.forEach((input) => {
//     if (input.id !== "nameInput") {
//       updates[input.id] = JSON.stringify(input.value);
//     }
//   });

//   // Update item name via a separate mutation (monday API treats it differently)
//   if ("name" in updates) {
//     const mutation = `
//       mutation ($itemId: Int!, $newName: String!) {
//         change_item_name(item_id: $itemId, name: $newName) {
//           id
//         }
//       }
//       `;
//     await fetch("/update-item", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         item_id: parseInt(itemId),
//         updates: {},
//       }),
//     });

//     // Call monday API directly for changing item name
//     await fetch("https://api.monday.com/v2", {
//       method: "POST",
//       headers: {
//         Authorization: `Bearer ${window.MONDAY_API_TOKEN}`, // You will need to handle this properly
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({
//         query: mutation,
//         variables: {
//           itemId: parseInt(itemId),
//           newName: nameInput.value,
//         },
//       }),
//     });
//     delete updates["name"];
//   }

//   // Update all other columns
//   if (Object.keys(updates).length > 0) {
//     await fetch("/update-item", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ item_id: parseInt(itemId), updates }),
//     });
//   }

//   alert("Item updated!");
// }
  


// const monday = mondaySdk();
// let currentItemId = null;
// let currentColumns = [];

// function searchItem() {
//   const itemId = document.getElementById("item-id").value.trim();
//   if (!itemId) {
//     alert("Please enter an Item ID");
//     return;
//   }

//   fetch("/get_item", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ item_id: itemId }),
//   })
//     .then((res) => res.json())
//     .then((data) => {
//       if (data.data && data.data.items.length > 0) {
//         const item = data.data.items[0];
//         currentItemId = item.id;
//         currentColumns = item.column_values;

//         let html = `<h3>Item: ${item.name}</h3>`;
//         currentColumns.forEach((col) => {
//           // Use col.text for display and editing
//           // Escape quotes to avoid HTML issues
//           const safeText = col.text ? col.text.replace(/"/g, "&quot;") : "";
//           html += `
//                     <div style="margin-bottom:8px;">
//                         <label><strong>${col.column.title}</strong> (${col.id}): </label>
//                         <input type="text" value="${safeText}" data-column="${col.id}" style="width:300px;" />
//                     </div>
//                 `;
//         });
//         document.getElementById("item-details").innerHTML = html;
//         document.getElementById("save-btn").style.display = "inline-block";
//       } else {
//         alert("Item not found.");
//         document.getElementById("item-details").innerHTML = "";
//         document.getElementById("save-btn").style.display = "none";
//       }
//     })
//     .catch((err) => {
//       alert("Error fetching item.");
//       console.error(err);
//     });
// }

// function saveItem() {
//   const inputs = document.querySelectorAll("#item-details input");
//   if (!currentItemId) {
//     alert("No item loaded.");
//     return;
//   }

//   const updates = Array.from(inputs).map((input) => {
//     return {
//       id: input.dataset.column,
//       value: input.value, // We'll convert to JSON string in backend
//     };
//   });

//   fetch("/update_item", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ item_id: currentItemId, updates: updates }),
//   })
//     .then((res) => res.json())
//     .then((data) => {
//       alert("Item updated successfully!");
//       // Optionally re-fetch item to update UI with latest data
//       searchItem();
//     })
//     .catch((err) => {
//       alert("Error updating item.");
//       console.error(err);
//     });
// }

const monday = mondaySdk(); // Make sure mondaySdk() is available
let currentItemId = null;
let currentColumns = [];

function searchItem() {
  const itemId = document.getElementById("item-id").value.trim();
  if (!itemId) {
    alert("Please enter an Item ID");
    return;
  }

  fetch("/get_item", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ item_id: itemId }),
  })
    .then((res) => res.json())
    .then((data) => {
      console.log("Item data:", data); // Debug

      if (data.data && data.data.items && data.data.items.length > 0) {
        const item = data.data.items[0];
        currentItemId = item.id;
        currentColumns = item.column_values;

        let html = `<h3>Item: ${item.name}</h3>`;
        currentColumns.forEach((col) => {
          const safeText = col.text ? col.text.replace(/"/g, "&quot;") : "";
          html += `
            <div style="margin-bottom:8px;">
              <label><strong>${col.column.title}</strong> (${col.id}): </label>
              <input type="text" value="${safeText}" data-column="${col.id}" style="width:300px;" />
            </div>
          `;
        });

        document.getElementById("item-details").innerHTML = html;
        document.getElementById("save-btn").style.display = "inline-block";
      } else {
        alert("Item not found.");
        document.getElementById("item-details").innerHTML = "";
        document.getElementById("save-btn").style.display = "none";
      }
    })
    .catch((err) => {
      console.error("Error fetching item:", err);
      alert("Failed to fetch item.");
    });
}

function saveItem() {
  const inputs = document.querySelectorAll("#item-details input");
  if (!currentItemId) {
    alert("No item loaded.");
    return;
  }

  const updates = Array.from(inputs).map((input) => {
    return {
      id: input.dataset.column,
      value: input.value,
    };
  });

  fetch("/update_item", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ item_id: currentItemId, updates: updates }),
  })
    .then((res) => res.json())
    .then((data) => {
      console.log("Update response:", data);
      alert("Item updated successfully!");
      searchItem(); // Optionally re-fetch to refresh
    })
    .catch((err) => {
      console.error("Error updating item:", err);
      alert("Failed to update item.");
    });
}
