"""Insights router - Daily insights and recommendations."""

from datetime import datetime
from typing import Literal, Optional

from fastapi import APIRouter, Query

router = APIRouter(prefix="/insights", tags=["insights"])


WeatherIcon = Literal["sun", "cloud", "rain", "snow", "fog"]


ALMANAC_LIBRARY = [
    {
        "lucky": ["Deep work", "Strategy review", "Long-form writing"],
        "taboo": ["Context switching", "Feature creep"],
    },
    {
        "lucky": ["User interviews", "Team syncs", "Prototype testing"],
        "taboo": ["All-hands", "Hasty decisions"],
    },
    {
        "lucky": ["Refactoring", "Learning", "Documentation review"],
        "taboo": ["Unplanned deploys", "Late-night coding"],
    },
    {
        "lucky": ["Launch planning", "Budget review", "Mentoring"],
        "taboo": ["Scope drift", "Over-optimization"],
    },
]

WEATHER_PRESETS = [
    {
        "condition": "Sunny",
        "icon": "sun",
        "temperature": 26,
        "high": 29,
        "low": 19,
        "humidity": 54,
        "windKph": 12,
    },
    {
        "condition": "Cloudy",
        "icon": "cloud",
        "temperature": 21,
        "high": 23,
        "low": 17,
        "humidity": 68,
        "windKph": 18,
    },
    {
        "condition": "Showers",
        "icon": "rain",
        "temperature": 18,
        "high": 20,
        "low": 15,
        "humidity": 81,
        "windKph": 25,
    },
    {
        "condition": "Snow",
        "icon": "snow",
        "temperature": 3,
        "high": 5,
        "low": -1,
        "humidity": 70,
        "windKph": 16,
    },
    {
        "condition": "Fog",
        "icon": "fog",
        "temperature": 14,
        "high": 16,
        "low": 10,
        "humidity": 88,
        "windKph": 9,
    },
]

QUOTES_BY_LANGUAGE = {
    "en": [
        {"text": "Consistency compounds louder than talent.", "author": "Lemind Manifesto"},
        {"text": "Ship small wins daily and the big ones follow.", "author": "Product Principle"},
        {"text": "Curiosity is the best equity you own.", "author": "Studio North"},
    ],
    "zh": [
        {"text": "把复杂的问题拆成今天能完成的一步。", "author": "Lemind 团队"},
        {"text": "写下灵感,它们总比遗忘更有价值。", "author": "实践者笔记"},
        {"text": "保持专注,时间会替你放大成果。", "author": "匠人精神"},
    ],
    "ja": [
        {"text": "小さな前進を積み重ねれば、成果は自ずと開く。", "author": "Lemind"},
        {"text": "今日の集中は、明日の自由をつくる。", "author": "創作者手帳"},
        {"text": "問いを持ち続ける人が、次の時代をつくる。", "author": "未来設計ノート"},
    ],
    "ko": [
        {"text": "매일 한 걸음의 완성이 장기적인 차이를 만든다.", "author": "루미나 스튜디오"},
        {"text": "집중이 곧 가장 강력한 투자다.", "author": "프로덕트 팀 노트"},
        {"text": "질문을 멈추지 않는 사람이 내일을 연다.", "author": "메이커 다이어리"},
    ],
}

LOCATION_BY_LANGUAGE = {
    "zh": "上海 · 中国",
    "ja": "東京 · 日本",
    "ko": "서울 · 대한민국",
    "en": "Global · Network",
}


def pick_by_date(items: list, seed: int):
    """Pick item from list based on date seed."""
    return items[seed % len(items)]


@router.get("/daily")
async def get_daily_snapshot(
    lang: str = Query("en", description="Language code: en, zh, ja, ko")
):
    """
    Get daily insight snapshot including weather, almanac, and motivational quote.
    
    Returns a comprehensive daily overview with:
    - Current date and weekday
    - Weather conditions
    - Daily almanac (lucky/taboo activities)
    - Motivational quote
    - Optional tips
    """
    now = datetime.now()
    date_seed = now.day
    day_seed = now.weekday()
    
    # Select data based on seeds
    weather = pick_by_date(WEATHER_PRESETS, day_seed)
    almanac = pick_by_date(ALMANAC_LIBRARY, date_seed)
    
    # Get quotes for language with fallback to English
    quotes = QUOTES_BY_LANGUAGE.get(lang, QUOTES_BY_LANGUAGE["en"])
    quote = pick_by_date(quotes, date_seed)
    
    # Get location for language with fallback to English
    location = LOCATION_BY_LANGUAGE.get(lang, LOCATION_BY_LANGUAGE["en"])
    
    # Format weekday based on language
    weekday_names = {
        "en": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        "zh": ["星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"],
        "ja": ["月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日", "日曜日"],
        "ko": ["월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일"],
    }
    weekday = weekday_names.get(lang, weekday_names["en"])[day_seed]
    
    return {
        "dateISO": now.isoformat(),
        "weekday": weekday,
        "location": location,
        "weather": weather,
        "almanac": {
            "lunarDate": "Lunar · Flow",
            "zodiac": "青龙",
            "lucky": almanac["lucky"],
            "taboo": almanac["taboo"],
            "solarTerm": "立冬",
        },
        "quote": quote,
        "tips": ["Plan your maker time", "Send gratitude note"],
        "lastUpdated": now.isoformat(),
    }
