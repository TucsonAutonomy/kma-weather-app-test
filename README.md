# 열흘날씨

기상청 단기예보와 중기예보를 연결해 오늘부터 10일간의 날씨를 보여주는 Next.js 웹앱입니다.

## 주요 기능

- 서울, 인천, 대전, 대구, 광주, 부산, 울산, 제주 지역 선택
- 오늘부터 최대 5일까지는 동네예보(단기예보) 사용
- 이후 10일까지는 중기육상예보와 중기기온예보 사용
- 최저·최고기온, 대표 날씨, 최대 강수확률 표시
- API 인증키를 브라우저에 노출하지 않는 서버 Route Handler
- 10분 서버 캐시와 반응형 UI

## 사용하는 기상청 API

기상청 API허브에서 단기예보와 중기예보 API 활용신청이 필요합니다.

1. [기상청 API허브 단기예보](https://apihub.kma.go.kr/apiList.do?apiMov=4.+%EB%8F%99%EB%84%A4%EC%98%88%EB%B3%B4%28%EC%B4%88%EB%8B%A8%EA%B8%B0%EC%8B%A4%ED%99%A9%C2%B7%EC%B4%88%EB%8B%A8%EA%B8%B0%EC%98%88%EB%B3%B4%C2%B7%EB%8B%A8%EA%B8%B0%EC%98%88%EB%B3%B4%29+%EC%A1%B0%ED%9A%8C&seqApi=10&seqApiSub=286)
   - VilageFcstInfoService_2.0/getVilageFcst
2. [기상청 API허브 중기예보](https://apihub.kma.go.kr/apiList.do?apiMov=%EC%A4%91%EA%B8%B0%EC%98%88%EB%B3%B4%EC%9E%90%EB%A3%8C%282001%EB%85%84+2%EC%9B%94+%EC%9D%B4%ED%9B%84%29+%EC%A1%B0%ED%9A%8C&seqApi=10&seqApiSub=287)
   - MidFcstInfoService/getMidLandFcst
   - MidFcstInfoService/getMidTa

중기예보는 발표 시각 기준 4~10일 예보를 제공하므로 단기예보와 날짜별로 병합합니다. 두 데이터가 겹치는 날짜에는 더 상세한 단기예보를 우선합니다.

## GitHub Codespaces에서 실행

로컬 체크아웃 없이 GitHub 저장소의 **Code → Codespaces → Create codespace**를 선택합니다.

Codespaces 터미널에서 다음 명령을 실행합니다.

    cp .env.example .env.local
    npm install
    npm run dev

.env.local에는 기상청 API허브에서 발급받은 **인증키**를 입력합니다.

    KMA_APIHUB_KEY=발급받은_API허브_인증키

.env 파일은 .gitignore에 포함되어 있으므로 인증키가 저장소에 커밋되지 않습니다.

## Vercel 배포

1. Vercel에서 이 GitHub 저장소를 Import합니다.
2. Project Settings → Environment Variables에 다음 값을 추가합니다.
   - Name: KMA_APIHUB_KEY
   - Value: 기상청 API허브 인증키
3. 배포를 실행합니다.

인증키에는 절대 NEXT_PUBLIC_ 접두사를 붙이지 마세요. 이 프로젝트는 서버의 /api/weather 경로에서만 키를 읽습니다.

## 프로젝트 구조

    app/
    ├── api/weather/route.ts  # 기상청 API 프록시
    ├── globals.css           # 반응형 디자인
    ├── layout.tsx
    └── page.tsx              # 지역 선택 및 10일 예보 UI
    lib/
    └── kma.ts                # 발표시각 계산, API 호출, 단기·중기 병합

## 데이터 이용 안내

- 데이터 출처: 기상청 API허브
- 중기예보는 일 2회(06시, 18시) 발표됩니다.
- 실제 날씨는 예보와 다를 수 있으므로 중요한 일정에는 최신 기상정보와 기상특보를 함께 확인하세요.
