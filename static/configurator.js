// document.addEventListener("DOMContentLoaded", function () {
//   const dropdown = document.getElementById("workspaceDropdown");

//   fetch("/get_workspaces")
//     .then((response) => response.json())
//     .then((workspaces) => {
//       console.log("Workspaces received:", workspaces); // Debug
//       if (Array.isArray(workspaces)) {
//         workspaces.forEach((ws) => {
//           const option = document.createElement("option");
//           option.value = ws.id;
//           option.textContent = ws.name;
//           dropdown.appendChild(option);
//         });
//       } else {
//         console.error("Invalid workspace data:", workspaces);
//       }
//     })
//     .catch((err) => {
//       console.error("Error loading workspaces:", err);
//     });

//     workspaceDropdown.addEventListener("change", function () {
//         const workspaceId = this.value;
//         boardDropdown.innerHTML = '<option value="">None</option>'; // reset
    
//         if (workspaceId) {
//           fetch(`/get_boards/${workspaceId}`)
//             .then((response) => response.json())
//             .then((boards) => {
//               if (Array.isArray(boards)) {
//                 boards.forEach((board) => {
//                   const option = document.createElement("option");
//                   option.value = board.id;
//                   option.textContent = board.name;
//                   boardDropdown.appendChild(option);
//                 });
//               } else {
//                 console.error("Invalid board data:", boards);
//               }
//             })
//             .catch((err) => {
//               console.error("Error loading boards:", err);
//             });
//         }
//       });
    
// });



// document.addEventListener("DOMContentLoaded", function () {
//   const workspaceDropdown = document.getElementById("workspaceDropdown");
//   const boardDropdown = document.getElementById("boardDropdown");

//   fetch("/get_workspaces")
//     .then((response) => response.json())
//     .then((workspaces) => {
//       console.log("Workspaces received:", workspaces); // Debug
//       if (Array.isArray(workspaces)) {
//         workspaces.forEach((ws) => {
//           const option = document.createElement("option");
//           option.value = ws.id;
//           option.textContent = ws.name;
//           workspaceDropdown.appendChild(option);
//         });
//       } else {
//         console.error("Invalid workspace data:", workspaces);
//       }
//     })
//     .catch((err) => {
//       console.error("Error loading workspaces:", err);
//     });

//   // 🔄 Fix: attach event listener to the correct variable
//   workspaceDropdown.addEventListener("change", function () {
//     const workspaceId = this.value;
//     boardDropdown.innerHTML = '<option value="">None</option>';

//     if (workspaceId) {
//       fetch(`/get_boards/${workspaceId}`)
//         .then((response) => response.json())
//         .then((boards) => {
//           console.log("Boards received:", boards); // Debug
//           if (Array.isArray(boards)) {
//             boards.forEach((board) => {
//               const option = document.createElement("option");
//               option.value = board.id;
//               option.textContent = board.name;
//               boardDropdown.appendChild(option);
//             });
//           } else {
//             console.error("Invalid board data:", boards);
//           }
//         })
//         .catch((err) => {
//           console.error("Error loading boards:", err);
//         });
//     }
//   });
// });



  
// document.addEventListener("DOMContentLoaded", function () {
//   const workspaceDropdown = document.getElementById("workspaceDropdown");
//   const boardDropdown = document.getElementById("boardDropdown");

//   fetch("/get_workspaces")
//     .then((response) => response.json())
//     .then((workspaces) => {
//       console.log("Workspaces received:", workspaces); // Debug
//       if (Array.isArray(workspaces)) {
//         workspaces.forEach((ws) => {
//           const option = document.createElement("option");
//           option.value = ws.id;
//           option.textContent = ws.name;
//           workspaceDropdown.appendChild(option);
//         });
//       } else {
//         console.error("Invalid workspace data:", workspaces);
//       }
//     })
//     .catch((err) => {
//       console.error("Error loading workspaces:", err);
//     });

//   // 🔄 Fix: attach event listener to the correct variable
//   workspaceDropdown.addEventListener("change", function () {
//     const workspaceId = this.value;
//     boardDropdown.innerHTML = '<option value="">None</option>';

//     if (workspaceId) {
//       fetch(`/get_boards/${workspaceId}`)
//         .then((response) => response.json())
//         .then((boards) => {
//           console.log("Boards received:", boards); // Debug
//           if (Array.isArray(boards)) {
//             boards.forEach((board) => {
//               const option = document.createElement("option");
//               option.value = board.id;
//               option.textContent = board.name;
//               boardDropdown.appendChild(option);
//             });
//           } else {
//             console.error("Invalid board data:", boards);
//           }
//         })
//         .catch((err) => {
//           console.error("Error loading boards:", err);
//         });
//     }
//   });
// });
  



// document.addEventListener("DOMContentLoaded", function () {
//   const workspaceDropdown = document.getElementById("workspaceDropdown");
//   const boardDropdown = document.getElementById("boardDropdown");
//   const columnsContainer = document.getElementById("columnsContainer");
//   const createSectionBtn = document.getElementById("createSectionBtn");
//   const sectionNameInput = document.getElementById("sectionNameInput");
//   const sectionsContainer = document.getElementById("sectionsContainer");

//   fetch("/get_workspaces")
//     .then((res) => res.json())
//     .then((workspaces) => {
//       workspaces.forEach((ws) => {
//         const option = document.createElement("option");
//         option.value = ws.id;
//         option.textContent = ws.name;
//         workspaceDropdown.appendChild(option);
//       });
//     });

//   workspaceDropdown.addEventListener("change", function () {
//     const workspaceId = this.value;
//     boardDropdown.innerHTML = '<option value="">None</option>';

//     fetch(`/get_boards/${workspaceId}`)
//       .then((res) => res.json())
//       .then((boards) => {
//         boards.forEach((board) => {
//           const option = document.createElement("option");
//           option.value = board.id;
//           option.textContent = board.name;
//           boardDropdown.appendChild(option);
//         });
//       });
//   });

//   document.getElementById("loadColumnsBtn").addEventListener("click", () => {
//     const boardId = boardDropdown.value;
//     if (!boardId) return;

//     fetch(`/get_columns/${boardId}`)
//       .then((res) => res.json())
//       .then((columns) => {
//         columnsContainer.innerHTML = "";
//         columns.forEach((col) => {
//           const pill = document.createElement("div");
//           pill.textContent = col.title;
//           pill.className = "pill";
//           pill.draggable = true;
//           pill.dataset.columnId = col.id;

//           pill.addEventListener("dragstart", (e) => {
//             e.dataTransfer.setData("text/plain", pill.textContent);
//           });

//           columnsContainer.appendChild(pill);
//         });
//       });
//   });

//   createSectionBtn.addEventListener("click", () => {
//     const sectionName = sectionNameInput.value.trim();
//     const workspaceId = workspaceDropdown.value;
//     if (!sectionName || !workspaceId) return;

//     fetch("/create_section", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         workspace_id: workspaceId,
//         section_name: sectionName,
//       }),
//     })
//       .then((res) => res.json())
//       .then((data) => {
//         const card = document.createElement("div");
//         card.className = "section-card";
//         card.innerHTML = `<h4>${sectionName}</h4>`;
//         const dropZone = document.createElement("div");
//         dropZone.className = "section";
//         dropZone.addEventListener("dragover", (e) => e.preventDefault());
//         dropZone.addEventListener("drop", (e) => {
//           e.preventDefault();
//           const columnText = e.dataTransfer.getData("text/plain");
//           const pill = document.createElement("div");
//           pill.className = "pill";
//           pill.textContent = columnText;
//           dropZone.appendChild(pill);
//         });
//         card.appendChild(dropZone);
//         sectionsContainer.appendChild(card);
//         sectionNameInput.value = "";
//       });
//   });
// });
  




// document.addEventListener("DOMContentLoaded", function () {
//   const workspaceDropdown = document.getElementById("workspaceDropdown");
//   const boardDropdown = document.getElementById("boardDropdown");
//   const columnsContainer = document.getElementById("columnsContainer");
//   const createSectionBtn = document.getElementById("createSectionBtn");
//   const sectionNameInput = document.getElementById("sectionNameInput");
//   const sectionsContainer = document.getElementById("sectionsContainer");

//   fetch("/get_workspaces")
//     .then((res) => res.json())
//     .then((workspaces) => {
//       workspaces.forEach((ws) => {
//         const option = document.createElement("option");
//         option.value = ws.id;
//         option.textContent = ws.name;
//         workspaceDropdown.appendChild(option);
//       });
//     });

//   workspaceDropdown.addEventListener("change", function () {
//     const workspaceId = this.value;
//     boardDropdown.innerHTML = '<option value="">None</option>';

//     fetch(`/get_boards/${workspaceId}`)
//       .then((res) => res.json())
//       .then((boards) => {
//         boards.forEach((board) => {
//           const option = document.createElement("option");
//           option.value = board.id;
//           option.textContent = board.name;
//           boardDropdown.appendChild(option);
//         });
//       });
//   });

//   document.getElementById("loadColumnsBtn").addEventListener("click", () => {
//     const boardId = boardDropdown.value;
//     if (!boardId) return;

//     fetch(`/get_columns/${boardId}`)
//       .then((res) => res.json())
//       .then((columns) => {
//         columnsContainer.innerHTML = "";
//         columns.forEach((col) => {
//           const pill = document.createElement("div");
//           pill.textContent = col.title;
//           pill.className = "pill";
//           pill.dataset.columnId = col.id;
//           columnsContainer.appendChild(pill);
//         });

//         makeSortable(columnsContainer, "column-pool");
//       });
//   });

// //   createSectionBtn.addEventListener("click", () => {
// //     const sectionName = sectionNameInput.value.trim();
// //     const workspaceId = workspaceDropdown.value;
// //     if (!sectionName || !workspaceId) return;

// //     fetch("/create_section", {
// //       method: "POST",
// //       headers: { "Content-Type": "application/json" },
// //       body: JSON.stringify({
// //         workspace_id: workspaceId,
// //          board_id: boardDropdown.value,
// //         section_name: sectionName,
// //       }),
// //     })
// //       .then((res) => res.json())
// //       .then((data) => {
// //         const card = document.createElement("div");
// //         card.className = "section-card";

// //         const title = document.createElement("h4");
// //         title.textContent = sectionName;
// //         card.appendChild(title);

// //         const sectionDropZone = document.createElement("div");
// //         sectionDropZone.className = "section";

// //         card.appendChild(sectionDropZone);
// //         sectionsContainer.appendChild(card);

// //         makeSortable(sectionDropZone, "section");

// //         updateSectionOrder(); // Recalculate order numbers
// //         sectionNameInput.value = "";
// //       });
// //   });


// // createSectionBtn.addEventListener("click", () => {
// //   const sectionName = sectionNameInput.value.trim();
// //   const workspaceId = workspaceDropdown.value;
// //   const boardId = boardDropdown.value;
// //   if (!sectionName || !workspaceId || !boardId) return;

// //   // Get columns in this section
// //   const sectionDropZone = document.createElement("div");
// //   sectionDropZone.className = "section";
// //   sectionDropZone.setAttribute("data-section-name", sectionName);

// //   const columns = [];
// //   const pills = sectionDropZone.querySelectorAll(".pill");
// //   pills.forEach((pill) => {
// //     columns.push({
// //       id: pill.dataset.columnId,
// //       title: pill.textContent,
// //     });
// //   });

// //   fetch("/create_section", {
// //     method: "POST",
// //     headers: { "Content-Type": "application/json" },
// //     body: JSON.stringify({
// //       workspace_id: workspaceId,
// //       board_id: boardId,
// //       section_name: sectionName,
// //       columns: columns,
// //     }),
// //   })
// //     .then((res) => res.json())
// //     .then((data) => {
// //       const card = document.createElement("div");
// //       card.className = "section-card";

// //       const title = document.createElement("h4");
// //       title.textContent = `${sectionName}`;
// //       card.appendChild(title);

// //       card.appendChild(sectionDropZone);
// //       sectionsContainer.appendChild(card);

// //       makeSortable(sectionDropZone, "section");

// //       updateSectionOrder();
// //       sectionNameInput.value = "";
// //     });
// // });
  

// createSectionBtn.addEventListener("click", () => {
//   const sectionName = sectionNameInput.value.trim();
//   if (!sectionName) return;

//   const card = document.createElement("div");
//   card.className = "section-card";

//   const title = document.createElement("h4");
//   title.textContent = `${sectionName}`;
//   card.appendChild(title);

//   const sectionDropZone = document.createElement("div");
//   sectionDropZone.className = "section";
//   sectionDropZone.dataset.sectionName = sectionName;
//   card.appendChild(sectionDropZone);

//   const saveBtn = document.createElement("button");
//   saveBtn.textContent = "Save Section";
//   saveBtn.addEventListener("click", () => {
//     const workspaceId = workspaceDropdown.value;
//     const boardId = boardDropdown.value;

//     const pills = sectionDropZone.querySelectorAll(".pill");
//     const columns = Array.from(pills).map((pill, index) => ({
//       id: pill.dataset.columnId,
//       title: pill.textContent,
//       order: index + 1,
//     }));

//     fetch("/create_section", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         workspace_id: workspaceId,
//         board_id: boardId,
//         section_name: sectionName,
//         columns: columns,
//       }),
//     })
//       .then((res) => res.json())
//       .then((data) => {
//         if (data.success) {
//           alert(`Section "${sectionName}" saved successfully!`);
//           saveBtn.disabled = true;
//         } else {
//           alert("Failed to save section.");
//         }
//       });
//   });

//   card.appendChild(saveBtn);
//   sectionsContainer.appendChild(card);

//   makeSortable(sectionDropZone, "section");

//   updateSectionOrder();
//   sectionNameInput.value = "";
// });
  




//   function makeSortable(container, type) {
//     new Sortable(container, {
//       group: "shared-columns",
//       animation: 150,
//       onAdd: function () {
//         updateColumnOrder();
//       },
//       onRemove: function () {
//         updateColumnOrder();
//       },
//       onSort: function () {
//         if (type === "section") updateColumnOrder();
//         if (type === "sections") updateSectionOrder();
//       },
//     });
//   }

//   new Sortable(sectionsContainer, {
//     group: "sections",
//     animation: 150,
//     handle: ".section-card",
//     draggable: ".section-card",
//     onSort: updateSectionOrder,
//   });

//   function updateSectionOrder() {
//     const sectionCards = sectionsContainer.querySelectorAll(".section-card");
//     sectionCards.forEach((card, index) => {
//       card.dataset.order = index + 1;
//       card.querySelector("h4").textContent = `${
//         card.querySelector("h4").textContent.split(" [")[0]
//       } [Order: ${index + 1}]`;
//     });
//   }

//   function updateColumnOrder() {
//     const sectionCards = sectionsContainer.querySelectorAll(".section-card");
//     sectionCards.forEach((card) => {
//       const columns = card.querySelectorAll(".pill");
//       columns.forEach((col, index) => {
//         col.dataset.order = index + 1;
//       });
//     });
//   }
// });



document.addEventListener("DOMContentLoaded", function () {
  const workspaceDropdown = document.getElementById("workspaceDropdown");
  const boardDropdown = document.getElementById("boardDropdown");
  const columnsContainer = document.getElementById("columnsContainer");
  const createSectionBtn = document.getElementById("createSectionBtn");
  const sectionNameInput = document.getElementById("sectionNameInput");
  const sectionsContainer = document.getElementById("sectionsContainer");

  fetch("/get_workspaces")
    .then((res) => res.json())
    .then((workspaces) => {
      workspaces.forEach((ws) => {
        const option = document.createElement("option");
        option.value = ws.id;
        option.textContent = ws.name;
        workspaceDropdown.appendChild(option);
      });
    });

  workspaceDropdown.addEventListener("change", function () {
    const workspaceId = this.value;
    boardDropdown.innerHTML = '<option value="">None</option>';

    fetch(`/get_boards/${workspaceId}`)
      .then((res) => res.json())
      .then((boards) => {
        boards.forEach((board) => {
          const option = document.createElement("option");
          option.value = board.id;
          option.textContent = board.name;
          boardDropdown.appendChild(option);
        });
      });
  });

  document.getElementById("loadColumnsBtn").addEventListener("click", () => {
    const boardId = boardDropdown.value;
    if (!boardId) return;

    fetch(`/get_columns/${boardId}`)
      .then((res) => res.json())
      .then((columns) => {
        columnsContainer.innerHTML = "";
        columns.forEach((col) => {
          const pill = document.createElement("div");
          pill.textContent = col.title;
          pill.className = "pill";
          pill.dataset.columnId = col.id;
          columnsContainer.appendChild(pill);
        });

        makeSortable(columnsContainer, "column-pool");
      });
  });

  createSectionBtn.addEventListener("click", () => {
    const sectionName = sectionNameInput.value.trim();
    if (!sectionName) return;

    const card = document.createElement("div");
    card.className = "section-card";

    const title = document.createElement("h4");
    title.textContent = `${sectionName}`;
    card.appendChild(title);

    const sectionDropZone = document.createElement("div");
    sectionDropZone.className = "section";
    sectionDropZone.dataset.sectionName = sectionName;
    card.appendChild(sectionDropZone);

    sectionsContainer.appendChild(card);
    makeSortable(sectionDropZone, "section");

    updateSectionOrder();
    sectionNameInput.value = "";
  });

  const saveAllBtn = document.createElement("button");
  saveAllBtn.textContent = "Save All Configuration";
  saveAllBtn.style.marginTop = "20px";
  saveAllBtn.addEventListener("click", () => {
    const boardId = boardDropdown.value;
    console.log("Board Id:--",boardId);
    if (!boardId) return;

    const sectionCards = sectionsContainer.querySelectorAll(".section-card");
    const sections = Array.from(sectionCards).map((card, index) => {
      const sectionDropZone = card.querySelector(".section");
      const sectionName =
        sectionDropZone.dataset.sectionName || `Section ${index + 1}`;
      const columns = Array.from(sectionDropZone.querySelectorAll(".pill")).map(
        (pill, colIndex) => ({
          id: pill.dataset.columnId,
          title: pill.textContent,
          order: colIndex + 1,
        })
      );

      return {
        section_name: sectionName,
        order_number: index + 1,
        columns: columns,
      };
    });

    fetch("/create_section", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        board_id: boardId,
        sections: sections,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          alert("All sections saved successfully!");
        } else {
          alert("Error saving sections.");
        }
      });
  });

  document.body.appendChild(saveAllBtn);

  function makeSortable(container, type) {
    new Sortable(container, {
      group: "shared-columns",
      animation: 150,
      onAdd: function () {
        updateColumnOrder();
      },
      onRemove: function () {
        updateColumnOrder();
      },
      onSort: function () {
        if (type === "section") updateColumnOrder();
        if (type === "sections") updateSectionOrder();
      },
    });
  }

  new Sortable(sectionsContainer, {
    group: "sections",
    animation: 150,
    handle: ".section-card",
    draggable: ".section-card",
    onSort: updateSectionOrder,
  });

  function updateSectionOrder() {
    const sectionCards = sectionsContainer.querySelectorAll(".section-card");
    sectionCards.forEach((card, index) => {
      card.dataset.order = index + 1;
      card.querySelector("h4").textContent = `${
        card.querySelector("h4").textContent.split(" [")[0]
      } [Order: ${index + 1}]`;
    });
  }

  function updateColumnOrder() {
    const sectionCards = sectionsContainer.querySelectorAll(".section-card");
    sectionCards.forEach((card) => {
      const columns = card.querySelectorAll(".pill");
      columns.forEach((col, index) => {
        col.dataset.order = index + 1;
      });
    });
  }
});
  