export type DailyForecast = {
  date: string;
  minTemp: number | null;
  maxTemp: number | null;
  weather: string;
  morningWeather?: string;
  afternoonWeather?: string;
  rainChance: number;
  source: "단기예보" | "중기예보";
};

export type ForecastResponse = {
  city: { id: string; name: string };
  updatedAt: string;
  forecast: DailyForecast[];
};

type City = {
  name: string;
  nx: number;
  ny: number;
  landRegId: string;
  tempRegId: string;
};

export const CITIES: Record<string, City> = {
  seoul: { name: "서울", nx: 60, ny: 127, landRegId: "11B00000", tempRegId: "11B10101" },
  incheon: { name: "인천", nx: 55, ny: 124, landRegId: "11B00000", tempRegId: "11B20201" },
  daejeon: { name: "대전", nx: 67, ny: 100, landRegId: "11C20000", tempRegId: "11C20401" },
  daegu: { name: "대구", nx: 89, ny: 90, landRegId: "11H10000", tempRegId: "11H10701" },
  gwangju: { name: "광주", nx: 58, ny: 74, landRegId: "11F20000", tempRegId: "11F20501" },
  busan: { name: "부산", nx: 98, ny: 76, landRegId: "11H20000", tempRegId: "11H20201" },
  ulsan: { name: "울산", nx: 102, ny: 84, landRegId: "11H20000", tempRegId: "11H20101" },
  jeju: { name: "제주", nx: 52, ny: 38, landRegId: "11G00000", tempRegId: "11G00201" },
};

type ShortItem = {
  category: string;
  fcstDate: string;
  fcstTime: string;
  fcstValue: string;
};

type ApiResponse = {
  response?: {
    header?: { resultCode?: string; resultMsg?: string };
    body?: { items?: { item?: unknown } };
  };
};

const KST_OFFSET = 9 * 60 * 60 * 1000;
const SHORT_BASE_TIMES = [2, 5, 8, 11, 14, 17, 20, 23];

function shiftedKst(now = new Date()) {
  return new Date(now.getTime() + KST_OFFSET);
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function dateKey(date: Date) {
  return String(date.getUTCFullYear()) + pad(date.getUTCMonth() + 1) + pad(date.getUTCDate());
}

function addDays(key: string, amount: number) {
  const date = new Date(Date.UTC(
    Number(key.slice(0, 4)),
    Number(key.slice(4, 6)) - 1,
    Number(key.slice(6, 8)) + amount,
  ));
  return dateKey(date);
}

function latestShortBase(now = new Date()) {
  const kst = shiftedKst(now);
  const minutes = kst.getUTCHours() * 60 + kst.getUTCMinutes();
  const available = SHORT_BASE_TIMES.filter((hour) => hour * 60 + 20 <= minutes);

  if (available.length) {
    const hour = available[available.length - 1];
    return { baseDate: dateKey(kst), baseTime: pad(hour) + "00" };
  }

  return { baseDate: addDays(dateKey(kst), -1), baseTime: "2300" };
}

function latestMidBase(now = new Date()) {
  const kst = shiftedKst(now);
  const minutes = kst.getUTCHours() * 60 + kst.getUTCMinutes();
  let key = dateKey(kst);
  let hour = 18;

  if (minutes >= 18 * 60 + 10) hour = 18;
  else if (minutes >= 6 * 60 + 10) hour = 6;
  else key = addDays(key, -1);

  return key + pad(hour) + "00";
}

function itemArray(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value as Record<string, unknown>[];
  if (value && typeof value === "object") return [value as Record<string, unknown>];
  return [];
}

async function requestKma(endpoint: string, params: Record<string, string | number>) {
  const authKey = process.env.KMA_APIHUB_KEY;
  if (!authKey) throw new Error("KMA_APIHUB_KEY 인증키가 설정되지 않았습니다.");

  const url = new URL("https://apihub.kma.go.kr/api/typ02/openApi/" + endpoint);
  url.searchParams.set("authKey", authKey);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));

  const response = await fetch(url, { next: { revalidate: 600 } });
  const text = await response.text();
  if (!response.ok) throw new Error("기상청 API가 HTTP " + response.status + "를 반환했습니다.");

  let data: ApiResponse;
  try {
    data = JSON.parse(text) as ApiResponse;
  } catch {
    throw new Error("기상청 API 응답이 JSON 형식이 아닙니다. 인증키를 확인해주세요.");
  }

  const header = data.response?.header;
  if (header?.resultCode !== "00") {
    throw new Error(header?.resultMsg ?? "기상청 API 요청에 실패했습니다.");
  }

  return itemArray(data.response?.body?.items?.item);
}

function ptyLabel(value: number) {
  const labels: Record<number, string> = {
    1: "비",
    2: "비 또는 눈",
    3: "눈",
    4: "소나기",
  };
  return labels[value] ?? "강수";
}

function skyLabel(value: number) {
  if (value === 1) return "맑음";
  if (value === 3) return "구름많음";
  return "흐림";
}

function parseShort(items: ShortItem[], today: string): DailyForecast[] {
  type Group = {
    temps: number[];
    min: number | null;
    max: number | null;
    pops: number[];
    sky: Array<{ time: string; value: number }>;
    pty: number[];
  };

  const groups = new Map<string, Group>();

  for (const item of items) {
    if (item.fcstDate < today) continue;
    const group = groups.get(item.fcstDate) ?? {
      temps: [], min: null, max: null, pops: [], sky: [], pty: [],
    };
    const value = Number(item.fcstValue);

    if (item.category === "TMP" && Number.isFinite(value)) group.temps.push(value);
    if (item.category === "TMN" && Number.isFinite(value)) group.min = value;
    if (item.category === "TMX" && Number.isFinite(value)) group.max = value;
    if (item.category === "POP" && Number.isFinite(value)) group.pops.push(value);
    if (item.category === "SKY" && Number.isFinite(value)) {
      group.sky.push({ time: item.fcstTime, value });
    }
    if (item.category === "PTY" && Number.isFinite(value)) group.pty.push(value);
    groups.set(item.fcstDate, group);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, group]) => {
      const precipitation = group.pty.find((value) => value > 0);
      const noonSky = [...group.sky].sort(
        (a, b) => Math.abs(Number(a.time) - 1200) - Math.abs(Number(b.time) - 1200),
      )[0]?.value;

      return {
        date,
        minTemp: group.min ?? (group.temps.length ? Math.min(...group.temps) : null),
        maxTemp: group.max ?? (group.temps.length ? Math.max(...group.temps) : null),
        weather: precipitation ? ptyLabel(precipitation) : skyLabel(noonSky ?? 4),
        rainChance: group.pops.length ? Math.max(...group.pops) : 0,
        source: "단기예보" as const,
      };
    });
}

function fieldNumber(item: Record<string, unknown>, key: string) {
  const value = Number(item[key]);
  return Number.isFinite(value) ? value : null;
}

function parseMid(
  land: Record<string, unknown>,
  temperature: Record<string, unknown>,
  tmFc: string,
): DailyForecast[] {
  const baseDate = tmFc.slice(0, 8);
  const result: DailyForecast[] = [];

  for (let day = 4; day <= 10; day += 1) {
    const minTemp = fieldNumber(temperature, "taMin" + day);
    const maxTemp = fieldNumber(temperature, "taMax" + day);

    if (day <= 7) {
      const morning = String(land["wf" + day + "Am"] ?? "정보 없음");
      const afternoon = String(land["wf" + day + "Pm"] ?? "정보 없음");
      const amRain = fieldNumber(land, "rnSt" + day + "Am") ?? 0;
      const pmRain = fieldNumber(land, "rnSt" + day + "Pm") ?? 0;

      result.push({
        date: addDays(baseDate, day),
        minTemp,
        maxTemp,
        weather: morning === afternoon ? morning : "오전 " + morning + " · 오후 " + afternoon,
        morningWeather: morning,
        afternoonWeather: afternoon,
        rainChance: Math.max(amRain, pmRain),
        source: "중기예보",
      });
    } else {
      result.push({
        date: addDays(baseDate, day),
        minTemp,
        maxTemp,
        weather: String(land["wf" + day] ?? "정보 없음"),
        rainChance: fieldNumber(land, "rnSt" + day) ?? 0,
        source: "중기예보",
      });
    }
  }

  return result;
}

export async function getForecast(cityId: string): Promise<ForecastResponse> {
  const city = CITIES[cityId];
  if (!city) throw new Error("지원하지 않는 지역입니다.");

  const shortBase = latestShortBase();
  const midBase = latestMidBase();
  const today = dateKey(shiftedKst());

  const [shortItems, landItems, tempItems] = await Promise.all([
    requestKma("VilageFcstInfoService_2.0/getVilageFcst", {
      pageNo: 1, numOfRows: 2000, dataType: "JSON",
      base_date: shortBase.baseDate, base_time: shortBase.baseTime,
      nx: city.nx, ny: city.ny,
    }),
    requestKma("MidFcstInfoService/getMidLandFcst", {
      pageNo: 1, numOfRows: 10, dataType: "JSON",
      regId: city.landRegId, tmFc: midBase,
    }),
    requestKma("MidFcstInfoService/getMidTa", {
      pageNo: 1, numOfRows: 10, dataType: "JSON",
      regId: city.tempRegId, tmFc: midBase,
    }),
  ]);

  const short = parseShort(shortItems as unknown as ShortItem[], today);
  const mid = parseMid(landItems[0] ?? {}, tempItems[0] ?? {}, midBase);
  const merged = new Map<string, DailyForecast>();

  for (const forecast of mid) merged.set(forecast.date, forecast);
  for (const forecast of short) merged.set(forecast.date, forecast);

  const lastDate = addDays(today, 9);
  const forecast = [...merged.values()]
    .filter((item) => item.date >= today && item.date <= lastDate)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 10);

  return {
    city: { id: cityId, name: city.name },
    updatedAt: new Date().toISOString(),
    forecast,
  };
}
