"use client";

import { useEffect, useState } from "react";
import type { DailyForecast, ForecastResponse } from "@/lib/kma";

const cities = [
  ["seoul", "서울"],
  ["incheon", "인천"],
  ["daejeon", "대전"],
  ["daegu", "대구"],
  ["gwangju", "광주"],
  ["busan", "부산"],
  ["ulsan", "울산"],
  ["jeju", "제주"],
];

function weatherIcon(weather: string) {
  if (weather.includes("눈")) return "❄️";
  if (weather.includes("소나기")) return "🌦️";
  if (weather.includes("비")) return "🌧️";
  if (weather.includes("맑")) return "☀️";
  if (weather.includes("구름많")) return "🌤️";
  return "☁️";
}

function dateLabel(date: string, weekdayOnly = false) {
  const parsed = new Date(
    Number(date.slice(0, 4)),
    Number(date.slice(4, 6)) - 1,
    Number(date.slice(6, 8)),
  );

  return new Intl.DateTimeFormat(
    "ko-KR",
    weekdayOnly
      ? { weekday: "short" }
      : { month: "long", day: "numeric", weekday: "long" },
  ).format(parsed);
}

function TemperatureRange({ day }: { day: DailyForecast }) {
  const min = day.minTemp ?? 0;
  const max = day.maxTemp ?? min;
  const width = Math.max(24, Math.min(100, 42 + (max - min) * 5));

  return (
    <div
      className="temperature-range"
      aria-label={`최저 ${day.minTemp ?? "–"}도, 최고 ${day.maxTemp ?? "–"}도`}
    >
      <span className="range-temp low">{day.minTemp ?? "–"}°</span>
      <span className="range-track" aria-hidden="true">
        <span className="range-fill" style={{ width: `${width}%` }} />
      </span>
      <span className="range-temp">{day.maxTemp ?? "–"}°</span>
    </div>
  );
}

export default function Home() {
  const [city, setCity] = useState("seoul");
  const [data, setData] = useState<ForecastResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function loadForecast() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/weather?city=" + city, {
          signal: controller.signal,
        });
        const body = await response.json();

        if (!response.ok) {
          throw new Error(body.error ?? "예보를 불러오지 못했습니다.");
        }

        setData(body);
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        setError(
          caught instanceof Error ? caught.message : "예보를 불러오지 못했습니다.",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadForecast();
    return () => controller.abort();
  }, [city]);

  const today = data?.forecast[0];

  return (
    <main className="weather-app">
      <div className="sky-glow sky-glow-one" />
      <div className="sky-glow sky-glow-two" />

      <div className="weather-shell">
        <header className="app-header">
          <a className="app-brand" href="#" aria-label="열흘날씨 홈">
            <span className="brand-icon">☀</span>
            <span>열흘날씨</span>
          </a>

          <label className="location-picker">
            <span className="sr-only">예보 지역 선택</span>
            <span aria-hidden="true">⌖</span>
            <select
              value={city}
              onChange={(event) => setCity(event.target.value)}
              aria-label="예보 지역 선택"
            >
              {cities.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </header>

        <section className="current-weather" aria-live="polite">
          {loading && !today ? (
            <div className="current-loading">하늘을 확인하는 중…</div>
          ) : today ? (
            <>
              <p className="current-location">{data.city.name}</p>
              <p className="current-date">{dateLabel(today.date)}</p>
              <div className="current-icon" role="img" aria-label={today.weather}>
                {weatherIcon(today.weather)}
              </div>
              <p className="current-temp">
                {data.current?.temperature ?? today.maxTemp ?? "–"}°
              </p>
              <p className="current-condition">{today.weather}</p>
              <p className="high-low">
                최고:{today.maxTemp ?? "–"}°&nbsp;&nbsp; 최저:
                {today.minTemp ?? "–"}°
              </p>
              <p className="observation-label">
                {data.current?.source ?? "단기예보"} 기준
              </p>
            </>
          ) : (
            <div className="current-loading">예보 정보가 없습니다.</div>
          )}
        </section>

        {error ? (
          <section className="glass-panel error-panel" role="alert">
            <strong>예보를 표시할 수 없어요.</strong>
            <p>{error}</p>
            <p>KMA_APIHUB_KEY 설정을 확인해주세요.</p>
          </section>
        ) : (
          <>
            <section className="glass-panel summary-panel" aria-label="오늘의 날씨 요약">
              <div className="summary-item">
                <span className="summary-icon">💧</span>
                <span className="summary-label">강수확률</span>
                <strong>{today?.rainChance ?? "–"}%</strong>
              </div>
              <div className="summary-divider" />
              <div className="summary-item">
                <span className="summary-icon">↗</span>
                <span className="summary-label">예보 범위</span>
                <strong>10일</strong>
              </div>
              <div className="summary-divider" />
              <div className="summary-item">
                <span className="summary-icon">◎</span>
                <span className="summary-label">데이터</span>
                <strong>기상청</strong>
              </div>
            </section>

            <section className="glass-panel forecast-panel" aria-busy={loading}>
              <div className="panel-heading">
                <span aria-hidden="true">▦</span>
                <h2>10일간의 일기예보</h2>
                {data && (
                  <time>
                    {new Date(data.updatedAt).toLocaleTimeString("ko-KR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })} 업데이트
                  </time>
                )}
              </div>

              <div className="forecast-list">
                {loading && !data
                  ? Array.from({ length: 10 }).map((_, index) => (
                      <div className="forecast-row loading-row" key={index} />
                    ))
                  : data?.forecast.map((day, index) => (
                      <article className="forecast-row" key={day.date}>
                        <div className="forecast-day">
                          <strong>
                            {index === 0 ? "오늘" : dateLabel(day.date, true)}
                          </strong>
                          <span>{day.source}</span>
                        </div>
                        <div className="forecast-condition">
                          <span
                            className="list-icon"
                            role="img"
                            aria-label={day.weather}
                          >
                            {weatherIcon(day.weather)}
                          </span>
                          <span className="rain-chance">
                            {day.rainChance > 0 ? `${day.rainChance}%` : ""}
                          </span>
                        </div>
                        <TemperatureRange day={day} />
                      </article>
                    ))}
              </div>
            </section>
          </>
        )}

        <footer>
          <span>기상청 단기·중기예보</span>
          <span>실제 날씨는 예보와 다를 수 있습니다.</span>
        </footer>
      </div>
    </main>
  );
}
