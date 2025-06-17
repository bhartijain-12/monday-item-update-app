from flask import Flask, render_template, request, jsonify
import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

MONDAY_API_URL = "https://api.monday.com/v2"
MONDAY_API_KEY = os.getenv("MONDAY_API_TOKEN")

headers = {
    "Authorization": MONDAY_API_KEY,
    "Content-Type": "application/json"
}


@app.route("/")
def index():
    return render_template("index.html")

@app.route("/configurator")
def configurator():
    return render_template("configurator.html")

@app.route("/get_workspaces")
def get_workspaces():
    query = {
        "query": """
        query {
            workspaces {
                id
                name
            }
        }
        """
    }

    response = requests.post(MONDAY_API_URL, headers=headers, json=query)
    

    if response.status_code == 200:
        data = response.json()
        workspaces = data["data"]["workspaces"]
        return jsonify(workspaces)
    else:
        return jsonify({"error": "Failed to fetch workspaces"}), 500
    
    
@app.route("/get_boards/<workspace_id>")
def get_boards(workspace_id):
    query = {
        "query": f"""
        query {{
            boards (workspace_ids: "{workspace_id}") {{
                id
                name
            }}
        }}
        """
    }

    response = requests.post(MONDAY_API_URL, headers=headers, json=query)

    if response.status_code == 200:
        data = response.json()
        boards = data["data"]["boards"]
        return jsonify(boards)
    else:
        return jsonify({"error": "Failed to fetch boards"}), 500


@app.route("/get_columns/<board_id>")
def get_columns(board_id):
    query = {
        "query": f"""
        query {{
            boards(ids: {board_id}) {{
                columns {{
                    id
                    title
                    type
                }}
            }}
        }}
        """
    }
    response = requests.post(MONDAY_API_URL, headers=headers, json=query)
    if response.status_code == 200:
        columns = response.json()["data"]["boards"][0]["columns"]
        return jsonify(columns)
    else:
        return jsonify({"error": "Failed to fetch columns"}), 500


@app.route("/get_existing_config")
def get_existing_config():
    board_name = request.args.get("board_name")
    print("Board name",board_name)

    if not board_name:
        return jsonify({"error": "Missing board name or subitem board id"}), 400

    master_table_board_id = os.getenv("MASTER_BOARD_ID")
    print("Master Table Board ID:", master_table_board_id)
    print("Board Name:", board_name)

    # Step 1: Fetch items from master table
    item_query = {
        "query": f"""
        query {{
            boards(ids: {master_table_board_id}) {{
                items_page(limit: 500) {{
                    items {{
                        id
                        name
                        column_values {{
                            id
                            text
                            value
                            column {{
                                title
                            }}
                        }}
                        subitems {{
                            id
                            name
                            column_values {{
                                id
                                text
                                column {{
                                    title
                                }}
                            }}
                            board {{
                                id
                                name
                            }}
                        }}
                    }}
                }}
            }}
        }}
        """
    }

    response = requests.post(MONDAY_API_URL, headers=headers, json=item_query)
    data = response.json()

    if "errors" in data:
        return jsonify({"error": "Failed to load existing sections"}), 500

    items = data["data"]["boards"][0]["items_page"]["items"]



    subitem_board_id = None
    for item in items:
        subitems = item.get("subitems", [])
        if subitems:
            subitem_board_id = subitems[0]["board"]["id"]
            print("Subitem Board ID (from backend):", subitem_board_id)
            break

    if not subitem_board_id:
        return jsonify({"error": "No subitems found to determine subitem board ID"}), 500

    # Step 2: Fetch subitem board column metadata
    subitem_columns_query = {
        "query": f"""
        query {{
            boards(ids: {subitem_board_id}) {{
                columns {{
                    id
                    title
                }}
            }}
        }}
        """
    }
    col_response = requests.post(MONDAY_API_URL, headers=headers, json=subitem_columns_query)
    col_data = col_response.json()

    if "errors" in col_data:
        return jsonify({"error": "Failed to load subitem board columns"}), 500

    column_map = {
        col["title"].strip().lower(): col["id"]
        for col in col_data["data"]["boards"][0]["columns"]
    }

    order_col_title = "order number"
    is_visible_title = "isvisible"
    order_col_id = column_map.get(order_col_title)
    is_visible_col_id = column_map.get(is_visible_title)

    if not order_col_id or not is_visible_col_id:
        return jsonify({"error": "Missing required subitem columns"}), 500

    # Step 3: Filter and prepare section data
    sections = []

    for item in items:
        if item["name"] != board_name:
            continue

        section_name = ""
        order_number = 0

        for col in item["column_values"]:
            title = col.get("column", {}).get("title", "").lower()
            if title == "section name":
                section_name = col["text"]
            elif title == "order number":
                try:
                    order_number = int(col["text"])
                except:
                    order_number = 0

        subitems = item.get("subitems", [])

        # Sort and filter subitems by order number and visibility
        def get_order(sub):
            for col in sub.get("column_values", []):
                if col.get("column", {}).get("title", "").lower() == order_col_title:
                    return int(col.get("text", "0")) if col.get("text", "").isdigit() else 0
            return 0

        def is_visible(sub):
            for col in sub.get("column_values", []):
                if col.get("column", {}).get("title", "").lower() == is_visible_title:
                    return col.get("text", "").strip().lower() == "v"
            return False

        sorted_subitems = sorted(
            [sub for sub in subitems if is_visible(sub)],
            key=get_order
        )

        column_titles = [sub["name"] for sub in sorted_subitems]

        sections.append({
            "section_name": section_name,
            "order_number": order_number,
            "columns": column_titles
        })

    # Sort sections by their order number
    sections.sort(key=lambda x: x["order_number"])

    return jsonify(sections)
















# @app.route("/create_section", methods=["POST"])
# def create_section():
#     master_table_board_id = os.getenv("MASTER_BOARD_ID")
#     data = request.json
#     board_id = data.get("board_id")

#     sections = data.get("sections", [])

#     if not board_id or not sections:
#         return jsonify({"success": False, "error": "Missing board_id or sections"})

#     # Step 2: Get column IDs for "Section Name" and "Order Number"
#     column_query = {
#         "query": f"""
#         query {{
#             boards(ids: {master_table_board_id}) {{
#                 columns {{
#                     id
#                     title
#                 }}
#             }}
#         }}
#     """
#     }

#     col_res = requests.post(MONDAY_API_URL, headers=headers, json=column_query)
#     column_data = col_res.json()
#     column_map = {
#         col["title"].lower(): col["id"]
#         for col in column_data["data"]["boards"][0]["columns"]
#     }

#     section_name_col_id = column_map.get("section name")
#     order_number_col_id = column_map.get("order number")
#     subitem_column_id = column_map.get("subitems")
#     print("Subitem Column id",subitem_column_id)

#     if not section_name_col_id or not order_number_col_id:
#         return jsonify({"success": False, "error": "Column IDs not found in Master Table"})
    

#     # Step 2.5: Get the name of the board by board_id
#     board_name_query = {
#         "query": f"""
#         query {{
#             boards(ids: {board_id}) {{
#                 name
#             }}
#         }}
#         """
#     }

#     board_res = requests.post(MONDAY_API_URL, headers=headers, json=board_name_query)
#     board_name = board_res.json()["data"]["boards"][0]["name"]
#     print("board_ndvdfvdfvdfvdfame",board_name)

#     for section in sections:
#         section_name = section["section_name"]
#         order_number = section["order_number"]
#         columns = section.get("columns", [])

#         # Prepare column_values as JSON string
#         column_values_dict = {
#             section_name_col_id: section_name,
#             order_number_col_id: str(order_number)
#         }
#         column_values_str = json.dumps(column_values_dict)  # Properly escaped for GraphQL
#         escaped_column_values_str = column_values_str.replace('"', '\\"')
#         # column_values: "{column_values_str.replace('"', '\\"')}"

#         # Create item in Master Table
#         create_item_query = {
#             "query": f"""
#             mutation {{
#                 create_item(
#                     board_id: {master_table_board_id},
#                     item_name: "{board_name}",
                    
#                     column_values: "{escaped_column_values_str}"
#                 ) {{
#                     id
#                 }}
#             }}
#             """
#         }
#         item_res = requests.post(MONDAY_API_URL, headers=headers, json=create_item_query)
#         item_data = item_res.json()
#         print("Item dataaaa",item_data)
#         item_id = item_data["data"]["create_item"]["id"]
#         print("Item Id",item_id)
        
#         #To query subitem board id

#         query = {
#             "query": f"""
#             query {{
#             boards(ids: {master_table_board_id}) {{
#                 columns(ids: "{subitem_column_id}") {{
#                 settings_str
#                 }}
#             }}
#             }}
#             """
#         }

#         response = requests.post(MONDAY_API_URL, headers=headers, json=query)
#         data = response.json()

#         try:
#             settings_str = data["data"]["boards"][0]["columns"][0]["settings_str"]
#             settings = json.loads(settings_str)
#             subitem_board_id = settings["boardIds"][0]
#             print("Subitem board ID:", subitem_board_id)
#         except Exception as e:
#             print("Error extracting subitem board ID:", str(e))
#             subitem_board_id = None

#     #To get Column Titles from Subitem Board
#         get_columns_query = {
#             "query": f"""
#             query {{
#                 boards(ids: {subitem_board_id}) {{
#                     columns {{
#                         id
#                         title
#                         type
#                     }}
#                 }}
#             }}
#             """
#         }
#         columns_response = requests.post(MONDAY_API_URL, headers=headers, json=get_columns_query)
#         columns_data = columns_response.json()
#         columns_list = columns_data['data']['boards'][0]['columns']
#         print("Columns Data",columns_data)
#         print("Column List",columns_list)

#         # Step 5: Map "Order Number" to its column ID
#         subitem_order_col_id = None
#         is_visible_col_id = None
#         for col in columns_list:
#             title = col['title'].strip().lower()
#             if title == "order number":
#                 subitem_order_col_id = col['id']
#                 print("Order Number Column ID:", subitem_order_col_id)
#             elif title == "isvisible":
#                 is_visible_col_id = col['id']
#                 print("IsVisible Column ID:", is_visible_col_id)
    
#     # If both are found, no need to continue loop
#             if subitem_order_col_id and is_visible_col_id:
#                 break

#         if not subitem_order_col_id:
#             return jsonify({"success": False, "error": "Order Number column not found in subitem board!"})
      
#         for idx, col in enumerate(columns):
#             subitem_name = col["title"]
#             col_order = idx + 1  # or col.get("order")

#             column_values_dict = {
#                 subitem_order_col_id: str(col_order),
#                 is_visible_col_id: {"checked": "true"}
#             }
#             column_values_str = json.dumps(column_values_dict).replace('"', '\\"')
#             print("Column Values Dict",column_values_dict)
#             print("Column values Str",column_values_str)
        
#         #Create Subitems
#             subitem_query = {
#                 "query": f"""
#                 mutation {{
#                     create_subitem(
#                         parent_item_id: {item_id},
#                         item_name: "{subitem_name}",
#                         column_values: "{column_values_str}"
#                     ) {{
#                         id
#                     }}
#                 }}
#                 """
#             }

#             subitem_res = requests.post(MONDAY_API_URL, headers=headers, json=subitem_query)
#             print("Subitem response:", subitem_res.json())




#     return jsonify({"success": True})






@app.route("/create_section", methods=["POST"])
def create_section():
    master_table_board_id = os.getenv("MASTER_BOARD_ID")
    data = request.json
    board_id = data.get("board_id")
    sections = data.get("sections", [])

    if not board_id or not sections:
        return jsonify({"success": False, "error": "Missing board_id or sections"})

    # Get board name from ID
    board_name_query = {
        "query": f"""query {{ boards(ids: {board_id}) {{ name }} }}"""
    }
    board_res = requests.post(MONDAY_API_URL, headers=headers, json=board_name_query)
    board_name = board_res.json()["data"]["boards"][0]["name"]

    # Get columns + items from master table
    column_query = {
        "query": f"""query {{
            boards(ids: {master_table_board_id}) {{
                columns {{ id title }}
                items_page(limit: 500) {{
                    items {{
                        id
                        name
                        column_values {{ id text value column {{ title }} }}
                        subitems {{ id }}
                    }}
                }}
            }}
        }}"""
    }
    col_res = requests.post(MONDAY_API_URL, headers=headers, json=column_query)
    board_data = col_res.json()["data"]["boards"][0]
    column_map = {col["title"].lower(): col["id"] for col in board_data["columns"]}
    section_name_col_id = column_map.get("section name")
    order_number_col_id = column_map.get("order number")
    subitem_column_id = column_map.get("subitems")

    if not section_name_col_id or not order_number_col_id:
        return jsonify({"success": False, "error": "Column IDs not found"})

    existing_items = board_data["items_page"]["items"]

    # Get subitem board ID
    settings_query = {
        "query": f"""query {{
            boards(ids: {master_table_board_id}) {{
                columns(ids: "{subitem_column_id}") {{
                    settings_str
                }}
            }}
        }}"""
    }
    settings_res = requests.post(MONDAY_API_URL, headers=headers, json=settings_query)
    settings_str = settings_res.json()["data"]["boards"][0]["columns"][0]["settings_str"]
    subitem_board_id = json.loads(settings_str)["boardIds"][0]

    # Get subitem board columns
    get_columns_query = {
        "query": f"""query {{
            boards(ids: {subitem_board_id}) {{
                columns {{ id title }}
            }}
        }}"""
    }
    sub_col_res = requests.post(MONDAY_API_URL, headers=headers, json=get_columns_query)
    sub_cols = sub_col_res.json()["data"]["boards"][0]["columns"]
    sub_col_map = {col["title"].strip().lower(): col["id"] for col in sub_cols}
    subitem_order_col_id = sub_col_map.get("order number")
    is_visible_col_id = sub_col_map.get("isvisible")

    if not subitem_order_col_id or not is_visible_col_id:
        return jsonify({"success": False, "error": "Subitem board columns not found"})

    for section in sections:
        section_name = section["section_name"]
        original_section_name = section.get("original_section_name", section_name)
        order_number = section["order_number"]
        columns = section.get("columns", [])

        # Match by original section name (for rename detection)
        matched_item = None
        for item in existing_items:
            if item["name"] != board_name:
                continue
            for col in item["column_values"]:
                if col["column"]["title"].lower() == "section name" and col["text"] == original_section_name:
                    matched_item = item
                    break
            if matched_item:
                break

        column_values_dict = {
            section_name_col_id: section_name,
            order_number_col_id: str(order_number)
        }
        column_values_str = json.dumps(column_values_dict).replace('"', '\\"')

        if matched_item:
            # Update item name/columns
            item_id = matched_item["id"]
            update_query = {
                "query": f"""
                mutation {{
                    change_multiple_column_values(
                        board_id: {master_table_board_id},
                        item_id: {item_id},
                        column_values: "{column_values_str}"
                    ) {{
                        id
                    }}
                }}
                """
            }
            update_res = requests.post(MONDAY_API_URL, headers=headers, json=update_query)
            print("Updated item:", update_res.json())

            # Delete subitems to refresh config
            for sub in matched_item.get("subitems", []):
                del_query = {
                    "query": f"""mutation {{ delete_item(item_id: {sub['id']}) {{ id }} }}"""
                }
                del_res = requests.post(MONDAY_API_URL, headers=headers, json=del_query)
                print("Deleted subitem:", del_res.json())

        else:
            # Create new section
            create_query = {
                "query": f"""
                mutation {{
                    create_item(
                        board_id: {master_table_board_id},
                        item_name: "{board_name}",
                        column_values: "{column_values_str}"
                    ) {{
                        id
                    }}
                }}
                """
            }
            create_res = requests.post(MONDAY_API_URL, headers=headers, json=create_query)
            item_id = create_res.json()["data"]["create_item"]["id"]
            print("Created item ID:", item_id)

        # Create new subitems
        for idx, col in enumerate(columns):
            subitem_name = col["title"]
            col_order = idx + 1
            sub_column_values = {
                subitem_order_col_id: str(col_order),
                is_visible_col_id: {"checked": "true"}
            }
            sub_col_str = json.dumps(sub_column_values).replace('"', '\\"')

            sub_query = {
                "query": f"""
                mutation {{
                    create_subitem(
                        parent_item_id: {item_id},
                        item_name: "{subitem_name}",
                        column_values: "{sub_col_str}"
                    ) {{
                        id
                    }}
                }}
                """
            }
            sub_res = requests.post(MONDAY_API_URL, headers=headers, json=sub_query)
            print("Created subitem:", sub_res.json())

    return jsonify({"success": True})
















@app.route("/get_item", methods=["POST"])
def get_item():
    item_id = request.json.get("item_id")

    query = {
        "query": f"""
        query {{
            items(ids: {item_id}) {{
                id
                name
                board {{
                    id
                    name
                }}
                column_values {{
                    id
                    value
                    type
                    text
                    column {{
                        title
                    }}
                }}
            }}
        }}
        """
    }

    response = requests.post(MONDAY_API_URL, json=query, headers=headers)
    return jsonify(response.json())


@app.route("/update_item", methods=["POST"])
def update_item():
    item_id = request.json.get("item_id")
    board_id = request.json.get("board_id")
    updates = request.json.get("updates")

    results = []

    for column in updates:
        column_id = column.get("id")
        column_value = column.get("value")
        column_type = column.get("type")
        if column_type == "status":
            value = json.dumps({"label": column_value})
        elif column_type == "date":
            value = json.dumps({"date": column_value})
        elif column_type == "people":
            value = json.dumps({
                "personsAndTeams": [{"id": int(column_value), "kind": "person"}]
            })
        else:
            value = json.dumps(column_value)

        mutation = {
            "query": f"""
                mutation {{
                    change_column_value(
                        item_id: {item_id},
                        board_id: {board_id},
                        column_id: "{column_id}",
                        value: {json.dumps(value)}
                    ) {{
                        id
                    }}
                }}
            """
        }
    

        response = requests.post(MONDAY_API_URL, json=mutation, headers=headers)
        results.append(response.json())

    return jsonify({"status": "updated", "results": results})

@app.route("/get_column_config", methods=["POST"])
def get_column_config():
    master_board_id = os.getenv("MASTER_BOARD_ID")
    board_name = request.json.get("board_name")

    master_query = {
        "query": f"""
        query {{
          boards(ids: {master_board_id}) {{
            items_page(limit: 100) {{
              items {{
                id
                name
                column_values {{
                  column {{
                    title
                  }}
                  id
                  text
                  value
                }}
                subitems {{
                  id
                  name
                  column_values {{
                    id
                    text
                  }}
                  board {{
                    id
                    name
                  }}
                }}
              }}
            }}
          }}
        }}
        """
    }

    master_resp = requests.post(MONDAY_API_URL, headers=headers, json=master_query)
    if master_resp.status_code != 200:
        return jsonify({"sections": []})

    boards_data = master_resp.json().get("data", {}).get("boards", [])
    if not boards_data:
        return jsonify({"sections": []})

    items = boards_data[0].get("items_page", {}).get("items", [])

    matched_sections = []
    for item in items:
        if item["name"].strip().lower() == board_name.strip().lower():

            # Extract Section Name and Order Number by matching column titles
            section_name = None
            section_order = float('inf')

            for cv in item.get("column_values", []):
                col_title = cv.get("column", {}).get("title", "").strip().lower()
                if col_title == "section name":
                    section_name = cv.get("text") or None
                elif col_title == "order number":
                    try:
                        section_order = int(cv.get("text"))
                    except (TypeError, ValueError):
                        section_order = float('inf')

            if not section_name:
                # fallback to item name if Section Name column is empty
                section_name = item["name"]

            subitems = item.get("subitems", [])
            if not subitems:
                continue

            subitem_board_id = subitems[0]["board"]["id"]

            # Query to get columns of the subitem board
            column_query = {
                "query": f"""
                query {{
                  boards(ids: {subitem_board_id}) {{
                    columns {{
                      id
                      title
                      type
                    }}
                  }}
                }}
                """
            }

            column_resp = requests.post(MONDAY_API_URL, headers=headers, json=column_query)
            if column_resp.status_code != 200:
                continue

            column_data = column_resp.json().get("data", {}).get("boards", [])
            if not column_data:
                continue

            columns = column_data[0].get("columns", [])
            column_map = {col["id"]: col["title"] for col in columns}

            allowed_columns = []
            for sub in subitems:
                column_name = sub["name"]
                col_values = {
                    column_map.get(cv["id"], cv["id"]): cv["text"]
                    for cv in sub.get("column_values", [])
                }

                visible = col_values.get("IsVisible", "").lower() == "v"
                try:
                    order = int(col_values.get("Order Number", ""))
                except (TypeError, ValueError):
                    order = float('inf')

                if visible:
                    allowed_columns.append({
                        "column_name": column_name,
                        "order": order
                    })

            allowed_columns.sort(key=lambda x: x["order"])

            matched_sections.append({
                "section_name": section_name,
                "allowed_columns": [col["column_name"] for col in allowed_columns],
                "order_number": section_order
            })

    # Sort sections by order number
    matched_sections.sort(key=lambda x: x["order_number"])

    return jsonify({"sections": matched_sections})



@app.route("/users", methods=["GET"])
def get_users():
    query = {"query": "query { users { id name email } }"}
    response = requests.post(MONDAY_API_URL, json=query, headers=headers)

    if response.status_code == 200:
        return jsonify(response.json().get("data", {}).get("users", [])), 200
    else:
        return jsonify({"error": response.text}), response.status_code


@app.route("/get_status_labels", methods=["POST"])
def get_status_labels():
    board_id = request.json.get("board_id")

    query = {
        "query": f"""
        query {{
          boards(ids: {board_id}) {{
            columns {{
              id
              title
              type
              settings_str
            }}
          }}
        }}
        """
    }

    response = requests.post(MONDAY_API_URL, json=query, headers=headers)

    if response.status_code == 200:
        status_labels = {}
        for col in response.json()["data"]["boards"][0]["columns"]:
            if col["type"] == "status":
                settings = json.loads(col["settings_str"])
                labels = settings.get("labels", {})
                status_labels[col["id"]] = {
                    "title": col["title"],
                    "labels": labels
                }
        return jsonify(status_labels), 200
    else:
        return jsonify({"error": response.text}), response.status_code


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)








# from flask import Flask, render_template, request, jsonify
# import os
# import requests
# import json
# from dotenv import load_dotenv

# load_dotenv()

# app = Flask(__name__)

# MONDAY_API_URL = "https://api.monday.com/v2"
# MONDAY_API_KEY = os.getenv("MONDAY_API_TOKEN")

# headers = {
#     "Authorization": MONDAY_API_KEY,
#     "Content-Type": "application/json"
# }


# @app.route("/")
# def index():
#     return render_template("index.html")


# @app.route("/get_item", methods=["POST"])
# def get_item():
#     item_id = request.json.get("item_id")

#     query = {
#         "query": f"""
#         query {{
#             items(ids: {item_id}) {{
#                 id
#                 name
#                 board {{
#                     id
#                     name
#                 }}
#                 column_values {{
#                     id
#                     value
#                     type
#                     text
#                     column {{
#                         title
#                     }}
#                 }}
#             }}
#         }}
#         """
#     }

#     response = requests.post(MONDAY_API_URL, json=query, headers=headers)
#     return jsonify(response.json())


# @app.route("/update_item", methods=["POST"])
# def update_item():
#     item_id = request.json.get("item_id")
#     board_id = request.json.get("board_id")
#     updates = request.json.get("updates")

#     results = []

#     for column in updates:
#         column_id = column.get("id")
#         column_value = column.get("value")
#         column_type = column.get("type")
#         if column_type == "status":
#             value = json.dumps({"label": column_value})
#         elif column_type == "date":
#             value = json.dumps({"date": column_value})
#         elif column_type == "people":
#             value = json.dumps({
#                 "personsAndTeams": [{"id": int(column_value), "kind": "person"}]
#             })
#         else:
#             value = json.dumps(column_value)

#         mutation = {
#             "query": f"""
#                 mutation {{
#                     change_column_value(
#                         item_id: {item_id},
#                         board_id: {board_id},
#                         column_id: "{column_id}",
#                         value: {json.dumps(value)}
#                     ) {{
#                         id
#                     }}
#                 }}
#             """
#         }

#         response = requests.post(MONDAY_API_URL, json=mutation, headers=headers)
#         results.append(response.json())

#     return jsonify({"status": "updated", "results": results})

# @app.route("/get_column_config", methods=["POST"])
# def get_column_config():
#     master_board_id = os.getenv("MASTER_BOARD_ID")
#     board_name = request.json.get("board_name")

#     master_query = {
#         "query": f"""
#         query {{
#           boards(ids: {master_board_id}) {{
#             items_page(limit: 100) {{
#               items {{
#                 id
#                 name
#                 column_values {{
#                   column {{
#                     title
#                   }}
#                   id
#                   text
#                   value
#                 }}
#                 subitems {{
#                   id
#                   name
#                   column_values {{
#                     id
#                     text
#                   }}
#                   board {{
#                     id
#                     name
#                   }}
#                 }}
#               }}
#             }}
#           }}
#         }}
#         """
#     }

#     master_resp = requests.post(MONDAY_API_URL, headers=headers, json=master_query)
#     if master_resp.status_code != 200:
#         return jsonify({"sections": []})

#     boards_data = master_resp.json().get("data", {}).get("boards", [])
#     if not boards_data:
#         return jsonify({"sections": []})

#     items = boards_data[0].get("items_page", {}).get("items", [])

#     matched_sections = []
#     for item in items:
#         if item["name"].strip().lower() == board_name.strip().lower():

#             # Extract Section Name and Order Number by matching column titles
#             section_name = None
#             section_order = float('inf')

#             for cv in item.get("column_values", []):
#                 col_title = cv.get("column", {}).get("title", "").strip().lower()
#                 if col_title == "section name":
#                     section_name = cv.get("text") or None
#                 elif col_title == "order number":
#                     try:
#                         section_order = int(cv.get("text"))
#                     except (TypeError, ValueError):
#                         section_order = float('inf')

#             if not section_name:
#                 # fallback to item name if Section Name column is empty
#                 section_name = item["name"]

#             subitems = item.get("subitems", [])
#             if not subitems:
#                 continue

#             subitem_board_id = subitems[0]["board"]["id"]

#             # Query to get columns of the subitem board
#             column_query = {
#                 "query": f"""
#                 query {{
#                   boards(ids: {subitem_board_id}) {{
#                     columns {{
#                       id
#                       title
#                       type
#                     }}
#                   }}
#                 }}
#                 """
#             }

#             column_resp = requests.post(MONDAY_API_URL, headers=headers, json=column_query)
#             if column_resp.status_code != 200:
#                 continue

#             column_data = column_resp.json().get("data", {}).get("boards", [])
#             if not column_data:
#                 continue

#             columns = column_data[0].get("columns", [])
#             column_map = {col["id"]: col["title"] for col in columns}

#             allowed_columns = []
#             for sub in subitems:
#                 column_name = sub["name"]
#                 col_values = {
#                     column_map.get(cv["id"], cv["id"]): cv["text"]
#                     for cv in sub.get("column_values", [])
#                 }

#                 visible = col_values.get("IsVisible", "").lower() == "v"
#                 try:
#                     order = int(col_values.get("Order Number", ""))
#                 except (TypeError, ValueError):
#                     order = float('inf')

#                 if visible:
#                     allowed_columns.append({
#                         "column_name": column_name,
#                         "order": order
#                     })

#             allowed_columns.sort(key=lambda x: x["order"])

#             matched_sections.append({
#                 "section_name": section_name,
#                 "allowed_columns": [col["column_name"] for col in allowed_columns],
#                 "order_number": section_order
#             })

#     # Sort sections by order number
#     matched_sections.sort(key=lambda x: x["order_number"])

#     return jsonify({"sections": matched_sections})








# # @app.route("/get_column_config", methods=["POST"])
# # def get_column_config():
# #     master_board_id = os.getenv("MASTER_BOARD_ID")
# #     board_name = request.json.get("board_name")

# #     # Step 1: Get items from the master board
# #     master_query = {
# #         "query": f"""
# #         query {{
# #           boards(ids: {master_board_id}) {{
# #             items_page(limit: 100) {{
# #               items {{
# #                 id
# #                 name
# #                 subitems {{
# #                   id
# #                   name
# #                   column_values {{
# #                     id
# #                     text
# #                   }}
# #                   board {{
# #                     id
# #                     name
# #                   }}
# #                 }}
# #               }}
# #             }}
# #           }}
# #         }}
# #         """
# #     }

# #     master_resp = requests.post(MONDAY_API_URL, headers=headers, json=master_query)
# #     if master_resp.status_code != 200:
# #         return jsonify({"sections 1": []})

# #     boards_data = master_resp.json().get("data", {}).get("boards", [])
# #     if not boards_data:
# #         return jsonify({"sections 2": []})

# #     items = boards_data[0].get("items_page", {}).get("items", [])

# #     matched_sections = []
# #     for item in items:
# #         print("ITEM NAME IN MASTER BOARD:", item["name"]) 
# #         if item["name"].strip().lower() == board_name.strip().lower():
# #             print("Matched:" , item["name"])
# #             subitems = item.get("subitems", [])

# #             if not subitems:
# #                 continue
            
# #             subitem_board_id = None
# #             if subitems:
# #              subitem_board_id = subitems[0]["board"]["id"]
# #              print("Subitem Board ID:", subitem_board_id)


# #             # Step 2: Get column titles for subitem board
# #             column_query = {
# #                 "query": f"""
# #                 query {{
# #                 boards(ids: {subitem_board_id}) {{
# #                     columns {{
# #                     id
# #                     title
# #                     type
# #                     }}
# #                 }}
# #                 }}
# #                 """
# #             }

# #             column_resp = requests.post(MONDAY_API_URL, headers=headers, json=column_query)
# #             column_map = {}
# #             if column_resp.status_code == 200:
# #                 for col in column_resp.json()["data"]["boards"][0]["columns"]:
# #                     column_map[col["id"]] = col["title"]
# #                     print("Columns in subitem board:")
# #                     for col_id, col_title in column_map.items():
# #                      print(f"Column ID: {col_id} -> Title: {col_title}")
# #             else:
# #                     print(f"Failed to fetch columns. Status code: {column_resp.status_code}")

# #             allowed_columns = []
# #             for sub in subitems:
# #                 column_name = sub["name"]
# #                 # col_values = {cv["id"]: cv["text"] for cv in sub["column_values"]}
# #                 col_values = {
# #                                     column_map.get(cv["id"], cv["id"]): cv["text"]
# #                                     for cv in sub["column_values"]
# #                              }

# #                 print(f"📋 Subitem: {column_name}, Columns: {col_values}")
# #                 visible = col_values.get("IsVisible", "").lower() == "v"
# #                 order_str = col_values.get("Order Number", "")
# #                 try:
# #                     order = int(order_str)
# #                 except:
# #                     order = float('inf')

# #                 if visible:
# #                     allowed_columns.append({
# #                         "column_name": column_name,
# #                         "order": order
# #                     })

# #             allowed_columns.sort(key=lambda x: x["order"])

# #             if allowed_columns:
# #                 matched_sections.append({
# #                     "section_name": "Main",  # Or use a separate column if you want dynamic sections
# #                     "allowed_columns": [col["column_name"] for col in allowed_columns],
# #                     "order_number": 0
# #                 })

# #     return jsonify({"sections 3": matched_sections})











# @app.route("/users", methods=["GET"])
# def get_users():
#     query = {"query": "query { users { id name email } }"}
#     response = requests.post(MONDAY_API_URL, json=query, headers=headers)

#     if response.status_code == 200:
#         return jsonify(response.json().get("data", {}).get("users", [])), 200
#     else:
#         return jsonify({"error": response.text}), response.status_code


# @app.route("/get_status_labels", methods=["POST"])
# def get_status_labels():
#     board_id = request.json.get("board_id")

#     query = {
#         "query": f"""
#         query {{
#           boards(ids: {board_id}) {{
#             columns {{
#               id
#               title
#               type
#               settings_str
#             }}
#           }}
#         }}
#         """
#     }

#     response = requests.post(MONDAY_API_URL, json=query, headers=headers)

#     if response.status_code == 200:
#         status_labels = {}
#         for col in response.json()["data"]["boards"][0]["columns"]:
#             if col["type"] == "status":
#                 settings = json.loads(col["settings_str"])
#                 labels = settings.get("labels", {})
#                 status_labels[col["id"]] = {
#                     "title": col["title"],
#                     "labels": labels
#                 }
#         return jsonify(status_labels), 200
#     else:
#         return jsonify({"error": response.text}), response.status_code


# if __name__ == "__main__":
#     port = int(os.environ.get("PORT", 5000))
#     app.run(host="0.0.0.0", port=port, debug=True)











# from flask import Flask, render_template, request, jsonify
# import os
# import requests
# import json
# from dotenv import load_dotenv

# load_dotenv()

# app = Flask(__name__)

# MONDAY_API_URL = "https://api.monday.com/v2"
# MONDAY_API_KEY = os.getenv("MONDAY_API_TOKEN")

# headers = {
#     "Authorization": MONDAY_API_KEY,
#     "Content-Type": "application/json"
# }


# @app.route("/")
# def index():
#     return render_template("index.html")


# @app.route("/get_item", methods=["POST"])
# def get_item():
#     item_id = request.json.get("item_id")

#     query = "{\"query\":\"query {\\r\\n  items(ids: ["+item_id+"]) {\\r\\n    id\\r\\n    name\\r\\n    board {\\r\\n      id\\r\\n      name\\r\\n    }\\r\\n    column_values {\\r\\n      id\\r\\n      value\\r\\n      type\\r\\n      text\\r\\n      column {\\r\\n        title\\r\\n      }\\r\\n    }\\r\\n  }\\r\\n}\\r\\n\\r\\n\\r\\n\",\"variables\":{}}"

#     response = requests.post(MONDAY_API_URL, data=query, headers=headers)
#     return jsonify(response.json())


# @app.route("/update_item", methods=["POST"])
# def update_item():
#     item_id = request.json.get("item_id")
#     board_id = request.json.get("board_id")
#     updates = request.json.get("updates")

#     results = []

#     for column in updates:
#         column_id = column.get("id")
#         column_value = column.get("value")
#         column_type = column.get("type")
#         if column_type == "status":
#             value = json.dumps({"label": column_value})
#         elif column_type == "date":
#             value = json.dumps({"date": column_value})  # Expecting YYYY-MM-DD
#         elif column_type == "people":
#             value = json.dumps({
#                 "personsAndTeams": [
#                     {
#                         "id": int(column_value),
#                         "kind": "person"
#                     }
#                 ]
#             })
#         else:
#             value = json.dumps(column_value)

#         mutation = {
#             "query": f"""
#                 mutation {{
#                     change_column_value(
#                         item_id: {item_id},
#                         board_id: {board_id},
#                         column_id: "{column_id}",
#                         value: {json.dumps(value)}
#                     ) {{
#                         id
#                     }}
#                 }}
#             """,
#             "variables": {}
#         }

#         response = requests.post(
#             MONDAY_API_URL,
#             json=mutation,
#             headers=headers
#         )

#         results.append(response.json())

#     return jsonify({"status": "updated", "results": results})


# @app.route("/get_column_config", methods=["POST"])
# def get_column_config():
#     master_board_id = os.getenv("MASTER_BOARD_ID")
#     board_name = request.json.get("board_name")

#     query = {
#         "query": f"""
#         query {{
#           boards(ids: {master_board_id}) {{
#             items_page(limit: 100) {{
#               items {{
#                 id
#                 name
#                 column_values {{
#                   column {{
#                     title
#                   }}
#                   text
#                   value
#                 }}
#               }}
#             }}
#           }}
#         }}
#         """
#     }

#     response = requests.post(MONDAY_API_URL, headers=headers, json=query)

#     if response.status_code != 200:
#         print("Error fetching config:", response.text)
#         return jsonify({"sections": []})

#     data = response.json().get("data", {}).get("boards", [])
#     if not data:
#         print("No boards found")
#         return jsonify({"sections": []})

#     items = data[0].get("items_page", {}).get("items", [])

#     matched_sections = []

#     for item in items:
#         if item["name"].strip().lower() == board_name.strip().lower():
#             col_map = {cv["column"]["title"]: cv["text"] for cv in item["column_values"]}
#             column_names = col_map.get("Column Names", "")
#             section_name = col_map.get("Section Name", "")
#             order_number_str = col_map.get("Order Number", "")

#             try:
#                 order_number = int(order_number_str)
#             except (ValueError, TypeError):
#                 order_number = float('inf')  # Default to end if invalid

#             allowed_columns = [c.strip() for c in column_names.split(",") if c.strip()]

#             if section_name and allowed_columns:
#                 matched_sections.append({
#                     "section_name": section_name,
#                     "allowed_columns": allowed_columns,
#                     "order_number": order_number
#                 })

#     if not matched_sections:
#         print("No config found for board:", board_name)
#         return jsonify({"sections": []})

#     # Sort sections by order_number
#     matched_sections.sort(key=lambda x: x["order_number"])

#     print("Matched sections:", matched_sections)
#     return jsonify({"sections": matched_sections})


# @app.route('/users', methods=['GET'])
# def get_users():
#     query = {
#         "query": """
#         query {
#           users {
#             id
#             name
#             email
#           }
#         }
#         """
#     }
#     response = requests.post(MONDAY_API_URL, json=query, headers=headers)

#     if response.status_code == 200:
#         data = response.json()
#         users = data.get("data", {}).get("users", [])
#         return jsonify(users), 200
#     else:
#         return jsonify({"error": response.text}), response.status_code


# @app.route("/get_status_labels", methods=["POST"])
# def get_status_labels():
#     board_id = request.json.get("board_id")

#     query = {
#         "query": f"""
#         query {{
#           boards(ids: {board_id}) {{
#             columns {{
#               id
#               title
#               type
#               settings_str
#             }}
#           }}
#         }}
#         """
#     }

#     response = requests.post(MONDAY_API_URL, json=query, headers=headers)

#     if response.status_code == 200:
#         data = response.json()
#         status_labels = {}

#         for column in data["data"]["boards"][0]["columns"]:
#             if column["type"] == "status":
#                 settings = json.loads(column["settings_str"])
#                 labels = settings.get("labels", {})
#                 status_labels[column["id"]] = {
#                     "title": column["title"],
#                     "labels": labels
#                 }

#         return jsonify(status_labels), 200
#     else:
#         return jsonify({"error": response.text}), response.status_code


# if __name__ == "__main__":
#     port = int(os.environ.get("PORT", 5000))
#     app.run(host="0.0.0.0", port=port, debug=True)









# from flask import Flask, render_template, request, jsonify
# import os
# import requests
# import json
# from dotenv import load_dotenv

# load_dotenv()

# app = Flask(__name__)

# MONDAY_API_URL = "https://api.monday.com/v2"
# MONDAY_API_KEY = os.getenv("MONDAY_API_TOKEN")

# headers = {
#     "Authorization": MONDAY_API_KEY,
#     "Content-Type": "application/json"
# }








# @app.route("/")
# def index():
#     return render_template("index.html")

# @app.route("/get_item", methods=["POST"])
# def get_item():
#     item_id = request.json.get("item_id")
   
#     query = "{\"query\":\"query {\\r\\n  items(ids: ["+item_id+"]) {\\r\\n    id\\r\\n    name\\r\\n    board {\\r\\n      id\\r\\n      name\\r\\n    }\\r\\n    column_values {\\r\\n      id\\r\\n      value\\r\\n      type\\r\\n      text\\r\\n      column {\\r\\n        title\\r\\n      }\\r\\n    }\\r\\n  }\\r\\n}\\r\\n\\r\\n\\r\\n\",\"variables\":{}}"
    
#     response = requests.post(MONDAY_API_URL, data=query, headers=headers)
#     return jsonify(response.json())

# @app.route("/update_item", methods=["POST"])
# def update_item():
#     item_id = request.json.get("item_id")  
#     board_id = request.json.get("board_id") 
#     updates = request.json.get("updates")

#     results = []

#     for column in updates:
       
#         column_id = column.get("id")
#         column_value = column.get("value")
#         column_type = column.get("type")
#         if column_type == "status":
#             value = json.dumps({"label": column_value})
#         elif column_type == "date":
#             value = json.dumps({"date": column_value})  # Expecting YYYY-MM-DD
#         elif column_type == "people":
#             value = json.dumps({
#                 "personsAndTeams": [
#                     {
#                         "id": int(column_value),  # Ensure it's an integer
#                         "kind": "person"
#                     }
#                 ]
#             })
#         else: 
#             value = json.dumps(column_value)
        
#         mutation = {
#             "query": f"""
#                 mutation {{
#                     change_column_value(
#                         item_id: {item_id},
#                         board_id: {board_id},
#                         column_id: "{column_id}",
#                         value: {json.dumps(value)}
#                     ) {{
#                         id
#                     }}
#                 }}
#             """,
#             "variables": {}
#         }

        
#         response = requests.post(
#             MONDAY_API_URL,
#             json=mutation,
#             headers=headers
#         )
       
#         results.append(response.json())

#     return jsonify({"status": "updated", "results": results})










# # @app.route("/get_column_config", methods=["POST"])
# # def get_column_config():
# #     master_board_id = os.getenv("MASTER_BOARD_ID")
# #     board_name = request.json.get("board_name")

# #     query = {
# #         "query": f"""
# #         query {{
# #           boards(ids: {master_board_id}) {{
# #             items_page(limit: 100) {{
# #               items {{
# #                 id
# #                 name
# #                 column_values {{
# #                   column {{
# #                     title
# #                   }}
# #                   text
# #                   value
# #                 }}
# #               }}
# #             }}
# #           }}
# #         }}
# #         """
# #     }

# #     response = requests.post(MONDAY_API_URL, headers=headers, json=query)

# #     if response.status_code != 200:
# #         print("Error fetching config:", response.text)
# #         return jsonify({"sections": []})

# #     data = response.json().get("data", {}).get("boards", [])
# #     if not data:
# #         print("No boards found")
# #         return jsonify({"sections": []})

# #     items = data[0].get("items_page", {}).get("items", [])

# #     matched_sections = []

# #     for item in items:
# #         if item["name"].strip().lower() == board_name.strip().lower():
# #             col_map = {cv["column"]["title"]: cv["text"] for cv in item["column_values"]}
# #             column_names = col_map.get("Column Names", "")
# #             section_name = col_map.get("Section Name", "")

# #             allowed_columns = [c.strip() for c in column_names.split(",") if c.strip()]

# #             # Add only if section_name exists and columns exist
# #             if section_name and allowed_columns:
# #                 matched_sections.append({
# #                     "section_name": section_name,
# #                     "allowed_columns": allowed_columns
# #                 })

# #     if not matched_sections:
# #         print("No config found for board:", board_name)
# #         return jsonify({"sections": []})

# #     # Sort sections alphabetically by section_name
# #     #matched_sections.sort(key=lambda x: x["section_name"].lower())

# #     print("Matched sections:", matched_sections)
# #     return jsonify({"sections": matched_sections})

# @app.route("/get_column_config", methods=["POST"])
# def get_column_config():
#     master_board_id = os.getenv("MASTER_BOARD_ID")
#     board_name = request.json.get("board_name")

#     query = {
#         "query": f"""
#         query {{
#           boards(ids: {master_board_id}) {{
#             items_page(limit: 100) {{
#               items {{
#                 id
#                 name
#                 column_values {{
#                   column {{
#                     title
#                   }}
#                   text
#                   value
#                 }}
#               }}
#             }}
#           }}
#         }}
#         """
#     }

#     response = requests.post(MONDAY_API_URL, headers=headers, json=query)

#     if response.status_code != 200:
#         print("Error fetching config:", response.text)
#         return jsonify({"sections": []})

#     data = response.json().get("data", {}).get("boards", [])
#     if not data:
#         print("No boards found")
#         return jsonify({"sections": []})

#     items = data[0].get("items_page", {}).get("items", [])

#     matched_sections = []

#     for item in items:
#         if item["name"].strip().lower() == board_name.strip().lower():
#             col_map = {cv["column"]["title"]: cv["text"] for cv in item["column_values"]}
#             column_names = col_map.get("Column Names", "")
#             section_name = col_map.get("Section Name", "")
#             order_number_str = col_map.get("Order Number", "")

#             try:
#                 order_number = int(order_number_str)
#             except (ValueError, TypeError):
#                 order_number = float('inf')  # Default to end if invalid

#             allowed_columns = [c.strip() for c in column_names.split(",") if c.strip()]

#             if section_name and allowed_columns:
#                 matched_sections.append({
#                     "section_name": section_name,
#                     "allowed_columns": allowed_columns,
#                     "order_number": order_number
#                 })

#     if not matched_sections:
#         print("No config found for board:", board_name)
#         return jsonify({"sections": []})

#     # Sort sections by Order Number
#     matched_sections.sort(key=lambda x: x["order_number"])

#     print("Matched sections:", matched_sections)
#     return jsonify({"sections": matched_sections})





# @app.route('/users', methods=['GET'])
# def get_users():
#     query = {
#         "query": """
#         query {
#           users {
#             id
#             name
#             email
#           }
#         }
#         """
#     }
#     response = requests.post(MONDAY_API_URL, json=query, headers=headers)

#     if response.status_code == 200:
#         data = response.json()
#         users = data.get("data", {}).get("users", [])
#         return jsonify(users), 200
#     else:
#         return jsonify({"error": response.text}), response.status_code
    
# @app.route("/get_status_labels", methods=["POST"])

# def get_status_labels():
#     board_id = request.json.get("board_id")

#     query = {
#         "query": f"""
#         query {{
#           boards(ids: {board_id}) {{
#             columns {{
#               id
#               title
#               type
#               settings_str
#             }}
#           }}
#         }}
#         """
#     }

#     response = requests.post(MONDAY_API_URL, json=query, headers=headers)

#     if response.status_code == 200:
#         data = response.json()
#         status_labels = {}

#         for column in data["data"]["boards"][0]["columns"]:
#             if column["type"] == "status":
#                 settings = json.loads(column["settings_str"])
#                 labels = settings.get("labels", {})
#                 status_labels[column["id"]] = {
#                     "title": column["title"],
#                     "labels": labels
#                 }

#         return jsonify(status_labels), 200
#     else:
#         return jsonify({"error": response.text}), response.status_code
   





# if __name__ == "__main__":
#     port = int(os.environ.get("PORT", 5000))
#     app.run(host="0.0.0.0", port=port, debug=True)

















# @app.route("/get_sections_columns", methods=["POST"])
# def get_sections_columns():
#     master_board_id = os.getenv("MASTER_BOARD_ID")
#     # Step 1: Query master board items with their "Order Number" numeric column and subitems (which define columns)
#     query = {
#         "query": f"""
#         query {{
#           boards(ids: {master_board_id}) {{
#             items {{
#               id
#               name
#               column_values(ids:["order_number"]) {{
#                 text
#                 value
#               }}
#               subitems {{
#                 id
#                 name
#                 column_values {{
#                   id
#                   text
#                   value
#                   column {{
#                     title
#                   }}
#                 }}
#               }}
#             }}
#           }}
#         }}
#         """
#     }

#     response = requests.post(MONDAY_API_URL, json=query, headers=headers)

#     if response.status_code != 200:
#         return jsonify({"error": f"Failed to fetch master board: {response.text}"}), 500

#     data = response.json().get("data", {})
#     boards = data.get("boards", [])
#     if not boards:
#         return jsonify({"sections": []})

#     items = boards[0].get("items", [])

#     # Parse sections: items are sections, ordered by 'order_number' column numeric value
#     sections = []

#     for item in items:
#         # Get section order number numeric value
#         order_num = None
#         for cv in item.get("column_values", []):
#             if cv.get("text") and cv.get("value") and "order_number" in cv.get("id", "order_number"):  # fallback to id match if needed
#                 try:
#                     order_num = int(json.loads(cv["value"]))
#                 except:
#                     try:
#                         order_num = int(cv["text"])
#                     except:
#                         order_num = None

#         # If not found or invalid, put a large order number so it goes last
#         if order_num is None:
#             order_num = 9999999

#         # Process subitems (columns)
#         columns = []
#         for subitem in item.get("subitems", []):
#             # Each subitem is a column definition
#             col_title = subitem.get("name", "")

#             # Find "IsVisible" and "Order Number" subitem column values
#             is_visible = False
#             col_order_num = 9999999

#             for cv in subitem.get("column_values", []):
#                 col_name = cv.get("column", {}).get("title", "").lower()

#                 if col_name == "isvisible":
#                     # Checkbox column: "v" means true
#                     is_visible = (cv.get("text", "").lower() == "v")
#                 elif col_name == "order number":
#                     # Numeric column for order
#                     try:
#                         col_order_num = int(cv.get("text") or 9999999)
#                     except:
#                         col_order_num = 9999999

#             if is_visible:
#                 columns.append({
#                     "title": col_title,
#                     "order": col_order_num
#                 })

#         # Sort columns by order
#         columns_sorted = sorted(columns, key=lambda c: c["order"])

#         sections.append({
#             "section_name": item.get("name", ""),
#             "order": order_num,
#             "columns": columns_sorted
#         })

#     # Sort sections by order
#     sections_sorted = sorted(sections, key=lambda s: s["order"])

#     return jsonify({"sections": sections_sorted})