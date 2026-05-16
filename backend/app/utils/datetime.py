from datetime import datetime, timezone, timedelta

def now() -> datetime:
    return datetime.now(timezone.utc)

def calc_expiry(seconds: int) -> datetime:
    return now() + timedelta(seconds=seconds)

def format(dt: datetime, fmt: str = "%Y-%m-%d %H:%M:%S") -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.strftime(fmt)