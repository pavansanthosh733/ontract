from flask import Blueprint, jsonify, request
from app.controllers.location_controller import LocationController

location_bp = Blueprint('location_bp', __name__)

# ---------------- Get All Malaysia Regions ----------------
@location_bp.route('/malaysia_regions', methods=['GET'])
def malaysia_regions():
    regions = LocationController.get_regions()
    return jsonify(regions), 200


# ---------------- Get States by Region ----------------
@location_bp.route('/malaysia_states', methods=['GET'])
def malaysia_states():
    region = request.args.get('region')
    if not region:
        return jsonify({"error": "Region parameter required"}), 400
    states = LocationController.fetch_states(region)
    return jsonify(states), 200


# ---------------- Get Cities by State ----------------
@location_bp.route('/malaysia_cities', methods=['GET'])
def malaysia_cities():
    state = request.args.get('state')
    if not state:
        return jsonify({"error": "State parameter required"}), 400
    cities = LocationController.get_cached_cities(state)
    return jsonify(cities), 200


# ---------------- Get Location by Postcode ----------------
@location_bp.route('/malaysia_postcode', methods=['GET'])
def malaysia_postcode():
    postcode = request.args.get('postcode')
    if not postcode:
        return jsonify({"error": "Postcode required"}), 400
    if len(postcode) != 5 or not postcode.isdigit():
        return jsonify({"error": "Invalid postcode format"}), 400
    loc = LocationController.fetch_postcode(postcode)
    if not loc:
        return jsonify({"error": "Postcode not found"}), 404
    return jsonify(loc), 200


# ---------------- Get All Malaysia Locations (state → city list) ----------------
@location_bp.route('/malaysia_locations', methods=['GET'])
def malaysia_locations():
    locations = LocationController.fetch_locations()
    return jsonify(locations), 200
