import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

import requests

logger = logging.getLogger(__name__)

WMO_DESCRIPTIONS = {
    0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Fog", 48: "Freezing fog",
    51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
    61: "Light rain", 63: "Rain", 65: "Heavy rain",
    71: "Light snow", 73: "Snow", 75: "Heavy snow", 77: "Snow grains",
    80: "Light showers", 81: "Rain showers", 82: "Heavy showers",
    85: "Snow showers", 86: "Heavy snow showers",
    95: "Thunderstorm", 96: "Thunderstorm w/ hail", 99: "Thunderstorm w/ heavy hail",
}


def _geocode_census(address: str) -> Optional[tuple[float, float]]:
    resp = requests.get(
        "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress",
        params={"address": address, "benchmark": "Public_AR_Current", "format": "json"},
        timeout=(2, 3),
    )
    matches = resp.json().get("result", {}).get("addressMatches", [])
    if not matches:
        return None
    c = matches[0]["coordinates"]
    return float(c["y"]), float(c["x"])  # lat, lng


def _geocode_nominatim(address: str) -> Optional[tuple[float, float]]:
    resp = requests.get(
        "https://nominatim.openstreetmap.org/search",
        params={"q": address, "format": "json", "limit": 1},
        headers={"User-Agent": "HomeInspectionEngine/1.0"},
        timeout=(2, 3),
    )
    results = resp.json()
    if not results:
        return None
    return float(results[0]["lat"]), float(results[0]["lon"])


def _geocode(address: str) -> Optional[tuple[float, float]]:
    """Try Census, then Nominatim full address, then Nominatim city+state fallback."""
    try:
        result = _geocode_census(address)
        if result:
            return result
    except Exception:
        pass
    try:
        result = _geocode_nominatim(address)
        if result:
            return result
    except Exception:
        pass
    # Strip street — try just city, state (last two comma-separated parts)
    parts = [p.strip() for p in address.split(',')]
    if len(parts) >= 2:
        short = ', '.join(parts[-2:])
        if short.lower() != address.lower():
            try:
                return _geocode_nominatim(short)
            except Exception:
                pass
    return None


def fetch_weather(address: str, inspection_date: datetime) -> Optional[dict]:
    """
    Geocodes address via US Census API, then fetches 5-day weather history
    from Open-Meteo ending on inspection_date. Also fetches hourly temperature
    to report the exact temp at the time the inspection started.
    Returns None on any failure — callers should treat None as "unavailable".
    """
    try:
        coords = _geocode(address)
        if not coords:
            logger.warning("Weather: could not geocode '%s'", address)
            return None
        lat, lng = coords

        end_date = inspection_date.date()
        start_date = end_date - timedelta(days=4)

        resp = requests.get(
            "https://api.open-meteo.com/v1/forecast",
            params={
                "latitude": lat,
                "longitude": lng,
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,weathercode",
                "hourly": "temperature_2m",
                "temperature_unit": "fahrenheit",
                "precipitation_unit": "inch",
                "windspeed_unit": "mph",
                "timezone": "auto",
            },
            timeout=(2, 4),
        )
        data = resp.json()

        # Open-Meteo returns times in local timezone — use utc_offset_seconds to
        # convert the inspection's UTC time into local time for matching.
        utc_offset = data.get("utc_offset_seconds", 0)
        local_inspection = inspection_date + timedelta(seconds=utc_offset)
        target_hour = local_inspection.strftime("%Y-%m-%dT%H:00")

        hourly = data.get("hourly", {})
        hourly_times = hourly.get("time", [])
        hourly_temps = hourly.get("temperature_2m", [])
        temp_at_inspection_f = None
        for i, t in enumerate(hourly_times):
            if t == target_hour:
                v = hourly_temps[i] if i < len(hourly_temps) else None
                temp_at_inspection_f = round(v, 1) if v is not None else None
                break

        d = data.get("daily", {})
        dates = d.get("time", [])
        n = len(dates)

        days = []
        for i, date in enumerate(dates):
            code = d.get("weathercode", [None] * n)[i]
            code_int = int(code) if code is not None else None
            precip = d.get("precipitation_sum", [None] * n)[i]
            days.append({
                "date": date,
                "temp_max_f": d.get("temperature_2m_max", [None] * n)[i],
                "temp_min_f": d.get("temperature_2m_min", [None] * n)[i],
                "precipitation_in": round(precip, 2) if precip is not None else None,
                "windspeed_max_mph": d.get("windspeed_10m_max", [None] * n)[i],
                "weather_code": code_int,
                "description": WMO_DESCRIPTIONS.get(code_int, "Unknown") if code_int is not None else None,
            })

        return {
            "location": {"lat": lat, "lng": lng},
            "fetched_at": datetime.now(timezone.utc).isoformat(),
            "temp_at_inspection_f": temp_at_inspection_f,
            "daily": days,
        }
    except Exception:
        logger.warning("Weather fetch failed for '%s'", address, exc_info=True)
        return None
