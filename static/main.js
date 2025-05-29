const monday = mondaySdk(); 
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
