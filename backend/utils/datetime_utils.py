from datetime import datetime
from zoneinfo import ZoneInfo
import os

APP_TIMEZONE = os.getenv("APP_TIMEZONE", "Asia/Kuala_Lumpur")
APP_DATETIME_FORMAT = os.getenv(
    "APP_DATETIME_FORMAT",
    "%Y-%m-%d %H:%M:%S"
)

TZ = ZoneInfo(APP_TIMEZONE)


def now_local():
    return datetime.now(TZ)


def format_datetime(dt):
    if not dt:
        return None

    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=ZoneInfo("UTC"))

    return dt.astimezone(TZ).strftime(APP_DATETIME_FORMAT)


def convert_timezone(dt):
    if not dt:
        return None

    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=ZoneInfo("UTC"))

    return dt.astimezone(TZ)