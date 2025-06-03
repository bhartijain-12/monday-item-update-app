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

@app.route("/get_item", methods=["POST"])
def get_item():
    item_id = request.json.get("item_id")
   
    query = "{\"query\":\"query {\\r\\n  items(ids: ["+item_id+"]) {\\r\\n    id\\r\\n    name\\r\\n    board {\\r\\n      id\\r\\n      name\\r\\n    }\\r\\n    column_values {\\r\\n      id\\r\\n      value\\r\\n      type\\r\\n      text\\r\\n      column {\\r\\n        title\\r\\n      }\\r\\n    }\\r\\n  }\\r\\n}\\r\\n\\r\\n\\r\\n\",\"variables\":{}}"
    
    response = requests.post(MONDAY_API_URL, data=query, headers=headers)
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
            value = json.dumps({"date": column_value})  # Expecting YYYY-MM-DD
        elif column_type == "people":
            value = json.dumps({
                "personsAndTeams": [
                    {
                        "id": int(column_value),  # Ensure it's an integer
                        "kind": "person"
                    }
                ]
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
            """,
            "variables": {}
        }

        
        response = requests.post(
            MONDAY_API_URL,
            json=mutation,
            headers=headers
        )
       
        results.append(response.json())

    return jsonify({"status": "updated", "results": results})


@app.route("/get_column_config", methods=["POST"])
def get_column_config():
    master_board_id = os.getenv("MASTER_BOARD_ID")
    board_name = request.json.get("board_name")

    query = {
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
                  text
                  value
                }}
              }}
            }}
          }}
        }}
        """
    }

    response = requests.post(MONDAY_API_URL, headers=headers, json=query)

    if response.status_code != 200:
        print("Error fetching config:", response.text)
        return jsonify({"sections": []})

    data = response.json().get("data", {}).get("boards", [])
    if not data:
        print("No boards found")
        return jsonify({"sections": []})

    items = data[0].get("items_page", {}).get("items", [])

    matched_sections = []

    for item in items:
        if item["name"].strip().lower() == board_name.strip().lower():
            col_map = {cv["column"]["title"]: cv["text"] for cv in item["column_values"]}
            column_names = col_map.get("Column Names", "")
            section_name = col_map.get("Section Name", "")

            allowed_columns = [c.strip() for c in column_names.split(",") if c.strip()]

            # Add only if section_name exists and columns exist
            if section_name and allowed_columns:
                matched_sections.append({
                    "section_name": section_name,
                    "allowed_columns": allowed_columns
                })

    if not matched_sections:
        print("No config found for board:", board_name)
        return jsonify({"sections": []})

    # Sort sections alphabetically by section_name
    matched_sections.sort(key=lambda x: x["section_name"].lower())

    print("Matched sections:", matched_sections)
    return jsonify({"sections": matched_sections})






@app.route('/users', methods=['GET'])
def get_users():
    query = {
        "query": """
        query {
          users {
            id
            name
            email
          }
        }
        """
    }
    response = requests.post(MONDAY_API_URL, json=query, headers=headers)

    if response.status_code == 200:
        data = response.json()
        users = data.get("data", {}).get("users", [])
        return jsonify(users), 200
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
        data = response.json()
        status_labels = {}

        for column in data["data"]["boards"][0]["columns"]:
            if column["type"] == "status":
                settings = json.loads(column["settings_str"])
                labels = settings.get("labels", {})
                status_labels[column["id"]] = {
                    "title": column["title"],
                    "labels": labels
                }

        return jsonify(status_labels), 200
    else:
        return jsonify({"error": response.text}), response.status_code
   
    

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)

