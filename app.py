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
    query = """
    query ($itemId: [Int]) {
      items (ids: $itemId) {
        id
        name
        column_values {
          id
          value
          type
          text
          column {
            title
          }
        }
      }
    }
    """
    variables = {"itemId": [int(item_id)]}
    response = requests.post(MONDAY_API_URL, json={"query": query, "variables": variables}, headers=headers)
    return jsonify(response.json())

@app.route("/update_item", methods=["POST"])
def update_item():
    item_id = request.json.get("item_id")
    updates = request.json.get("updates") 
    results = []
    for column in updates:
        mutation = """
        mutation ($itemId: Int!, $columnId: String!, $value: JSON!) {
          change_column_value(item_id: $itemId, column_id: $columnId, value: $value) {
            id
          }
        }
        """
        # Convert the value to JSON string for the mutation
        value_json = json.dumps(column["value"])

        variables = {
            "itemId": int(item_id),
            "columnId": column["id"],
            "value": value_json
        }
        result = requests.post(MONDAY_API_URL, json={"query": mutation, "variables": variables}, headers=headers)
        results.append(result.json())

    return jsonify({"status": "updated", "results": results})

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)