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

function dateLabel(date: string, long = false) {
  const parsed = new Date(
    Number(date.slice(0, 4)),
    Number(date.slice(4, 6)) - 1,
    Number(date.slice(6, 8)),
  );

  return new Intl.DateTimeFormat("ko-KR", {
    month: long ? "long" : "numeric",
    day: "numeric",
    weekday: "short",
  }).format(parsed);
}

function Temperature({ day }: { day: DailyForecast }) {
  return (
    <div className="temperature" aria-label="최저 및 최고 기온">
      <span className="low">{day.minTemp ?? "–"}°</span>
      <span className="divider">/</span>
      <strong>{day.maxTemp ?? "–"}°</strong>
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
    <main>
      <div className="orb orb-one" />
      <div className="orb orb-two" />

      <section className="shell">
        <header className="topbar">
          <a className="brand" href="#" aria-label="열흘날씨 홈">
            <span className="brand-mark">10</span>
            <span>열흘날씨</span>
          </a>
          <span className="source-badge">기상청 데이터</span>
        </header>

        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">오늘부터 열흘까지</p>
            <h1>
              멀리 보는 날씨,
              <br />
              가볍게 준비하세요.
            </h1>
            <p className="intro">
              동네예보와 중기예보를 자연스럽게 이어 붙여
              <br className="desktop-only" /> 앞으로 10일의 흐름을 보여드려요.
            </p>

            <label className="city-picker">
              <span>지역 선택</span>
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
          </div>

          <div className="today-card" aria-live="polite">
            {loading && !today ? (
              <div className="skeleton">예보를 불러오는 중…</div>
            ) : today ? (
              <>
                <div className="today-head">
                  <div>
                    <span className="today-label">TODAY</span>
                    <h2>{data.city.name}</h2>
                    <p>{dateLabel(today.date, true)}</p>
                  </div>
                  <span className="hero-icon" role="img" aria-label={today.weather}>
                    {weatherIcon(today.weather)}
                  </span>
                </div>
                <div className="today-weather">{today.weather}</div>
                <div className="today-bottom">
                  <Temperature day={today} />
                  <span className="rain">강수 {today.rainChance}%</span>
                </div>
              </>
            ) : (
              <div className="skeleton">예보 정보가 없습니다.</div>
            )}
          </div>
        </section>

        {error ? (
          <section className="error-panel" role="alert">
            <strong>예보를 표시할 수 없어요.</strong>
            <p>{error}</p>
            <p className="error-help">
              배포 환경에 KMA_SERVICE_KEY가 설정되어 있는지 확인해주세요.
            </p>
          </section>
        ) : (
          <section className="forecast-section" aria-busy={loading}>
            <div className="section-title">
              <div>
                <p className="eyebrow">10-DAY FORECAST</p>
                <h2>열흘 예보</h2>
              </div>
              {data && (
                <p className="updated">
                  {new Date(data.updatedAt).toLocaleString("ko-KR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })} 업데이트
                </p>
              )}
            </div>

            <div className="forecast-grid">
              {loading && !data
                ? Array.from({ length: 10 }).map((_, index) => (
                    <div className="day-card loading-card" key={index} />
                  ))
                : data?.forecast.map((day, index) => (
                    <article className={"day-card " + (index === 0 ? "active" : "")} key={day.date}>
                      <div className="day-top">
                        <div>
                          <span className="day-index">
                            {index === 0 ? "오늘" : "D+" + index}
                          </span>
                          <h3>{dateLabel(day.date)}</h3>
                        </div>
                        <span className="day-icon" role="img" aria-label={day.weather}>
                          {weatherIcon(day.weather)}
                        </span>
                      </div>

                      <p className="weather-name">{day.weather}</p>
                      <Temperature day={day} />

                      <div className="rain-row">
                        <span className="drop">●</span>
                        <span>강수확률</span>
                        <strong>{day.rainChance}%</strong>
                      </div>
                      <span className="forecast-source">{day.source}</span>
                    </article>
                  ))}
            </div>
          </section>
        )}

        <footer>
          <p>데이터 출처: 기상청 · 공공데이터포털</p>
          <p>실제 날씨는 예보와 다를 수 있으니 최신 기상정보를 확인하세요.</p>
        </footer>
      </section>
    </main>
  );
}
