import requests

# ---------------------------------------------------------
# Malaysia Location Controller
# ---------------------------------------------------------
class LocationController:
    _FLAT_CACHE = {}
    _CITY_CACHE = {}
    _POSTCODE_CACHE = {}

    @staticmethod
    def _load_flat_data():
        """Fetches all Malaysia states and cities in flat form."""
        url = "https://raw.githubusercontent.com/AsyrafHussin/malaysia-postcodes/main/all.json"
        try:
            r = requests.get(url, timeout=10)
            r.raise_for_status()
            data = r.json()
            flat = {}
            for state in data.get('state', []):
                flat[state['name']] = [c['name'] for c in state.get('city', [])]
            return flat
        except Exception as e:
            print("Flat location load error:", e)
            return {}

    @classmethod
    def _load_postcode_data(cls):
        """Loads and caches postcode-to-location mapping."""
        if cls._POSTCODE_CACHE:
            return cls._POSTCODE_CACHE
        url = "https://raw.githubusercontent.com/AsyrafHussin/malaysia-postcodes/main/all.json"
        try:
            r = requests.get(url, timeout=10)
            r.raise_for_status()
            data = r.json()
            cache = {}
            for state_obj in data.get('state', []):
                state_name = state_obj['name']
                for city_obj in state_obj.get('city', []):
                    city_name = city_obj['name']
                    for postcode in city_obj.get('postcode', []):
                        cache[postcode] = {'state': state_name, 'city': city_name}
            cls._POSTCODE_CACHE = cache
            return cache
        except Exception as e:
            print("Postcode load error:", e)
            return {}

    # --------------------- Data Fetch Methods ---------------------

    @classmethod
    def fetch_locations(cls):
        """Returns cached Malaysia locations (state → city list)."""
        if not cls._FLAT_CACHE:
            cls._FLAT_CACHE.update(cls._load_flat_data())
        return cls._FLAT_CACHE.copy()

    @classmethod
    def fetch_postcode(cls, postcode):
        """Returns state & city for a given postcode."""
        cls._load_postcode_data()
        return cls._POSTCODE_CACHE.get(postcode)

    @staticmethod
    def get_regions():
        """Static mapping of Malaysia regions and states."""
        return {
            "Northern Region": ["Perlis", "Kedah", "Penang", "Perak"],
            "Central Region": ["Selangor", "Kuala Lumpur", "Putrajaya"],
            "Southern Region": ["Negeri Sembilan", "Melaka", "Johor"],
            "Eastern Region": ["Pahang", "Terengganu", "Kelantan"],
            "East Malaysia Region (Sabah/Sarawak)": ["Sabah", "Sarawak", "Labuan"]
        }

    @classmethod
    def fetch_states(cls, region_name):
        """Returns all states in a given region."""
        regions = cls.get_regions()
        return regions.get(region_name, [])

    @staticmethod
    def fetch_cities(state_name):
        """Fetches all cities for a given state name."""
        url = "https://raw.githubusercontent.com/AsyrafHussin/malaysia-postcodes/main/all.json"
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            data = response.json()
            for state in data['state']:
                if state['name'] == state_name:
                    return [city['name'] for city in state['city']]
            return []
        except Exception as e:
            print(f"Location API error: {e}")
            return []

    @classmethod
    def get_cached_cities(cls, state_name):
        """Caches and returns city list for a given state."""
        if state_name not in cls._CITY_CACHE:
            cls._CITY_CACHE[state_name] = cls.fetch_cities(state_name)
        return cls._CITY_CACHE[state_name]
