# Y&A Suite 디자인 시스템 가이드

본 문서는 Y&A Suite의 공통 디자인 시스템 기준을 정의한다. 목표는 서비스가 여러 개로 나뉘어도 사용자가 하나의 Y&A 업무 시스템을 쓰고 있다고 느끼게 하는 것이다.

Y&A Suite의 UI는 **그레이스케일 중심의 업무형 인터페이스**를 기본으로 하며, 회사 CI 컬러인 `#E22213`은 활성화, 주요 액션, 포인트 강조에 제한적으로 사용한다.

## 1. 디자인 원칙

Y&A Suite는 내부 업무, 투자, 프로젝트, 펀드, 마스터 데이터 관리를 위한 시스템이다. 따라서 장식적인 화면보다 빠른 판단과 안정적인 입력을 우선한다.

핵심 원칙:

1. 통일감: 모든 서비스는 같은 레이아웃, 컴포넌트, 상태 표현을 사용한다.
2. 업무 밀도: 정보량이 많은 화면에서도 스캔이 쉬워야 한다.
3. 절제된 색상: 기본 UI는 그레이스케일을 사용하고, `#E22213`은 중요한 액션에만 사용한다.
4. 명확한 상태: 승인, 대기, 반려, 위험, 비활성 상태는 색상과 텍스트를 함께 사용한다.
5. 반응형 안정성: 모바일에서 깨지지 않되, 복잡한 업무는 데스크톱 최적화를 우선한다.
6. 접근성: 색상 대비, 키보드 포커스, 텍스트 가독성, 터치 영역을 일관되게 관리한다.

피해야 할 것:

```txt
과한 그라디언트
서비스별로 다른 색상 체계
카드 남발
너무 큰 여백과 낮은 정보 밀도
컬러만으로 상태를 구분하는 UI
표준 컴포넌트를 벗어난 임의 스타일
```

## 2. CI 컬러

Y&A Suite의 핵심 CI 컬러는 다음 두 가지이다.

| 이름 | HEX | 용도 |
| :--- | :--- | :--- |
| Y&A Red | `#E22213` | 주요 액션, 활성 상태, 포인트 강조 |
| Y&A Gray | `#515151` | 보조 텍스트, 아이콘, 중립 UI |

`#E22213`은 강한 색이므로 넓은 배경, 전체 사이드바, 대형 영역에는 사용하지 않는다. 버튼, 활성 탭, 작은 배지, 링크, 포커스 링, 차트 포인트처럼 사용자의 시선을 보내야 하는 곳에만 사용한다.

## 3. 컬러 팔레트

### 3.1 Red Palette

CI Red `#E22213`을 중심으로 업무 UI에 필요한 밝기 단계를 정의한다.

| Token | HEX | 용도 |
| :--- | :--- | :--- |
| `red.25` | `#FFF5F4` | 아주 약한 배경, hover tint |
| `red.50` | `#FDECEA` | 위험/강조 배경 |
| `red.100` | `#FAD3CF` | 선택 배경, 약한 경고 영역 |
| `red.200` | `#F5A9A1` | 비활성 강조, 차트 보조 |
| `red.300` | `#EF7D72` | 보조 포인트 |
| `red.400` | `#EA5143` | hover, secondary accent |
| `red.500` | `#E22213` | CI primary, 주요 액션 |
| `red.600` | `#C91E11` | primary hover, 텍스트 강조 |
| `red.700` | `#B31A0F` | active, 진한 텍스트 |
| `red.800` | `#9F170D` | 오류 텍스트, 고대비 강조 |
| `red.900` | `#86130B` | 가장 강한 위험/강조 |

권장 사용:

```txt
Primary button background: red.500
Primary button hover: red.600
Pressed/active: red.700
Danger text on light background: red.700 이상
Weak alert background: red.50
Focus ring: red.500 또는 red.600
```

주의:

```txt
red.500은 흰 배경에서 일반 텍스트 대비가 약 4.70:1이다.
작은 본문 텍스트에는 red.600 이상을 우선 사용한다.
red.50, red.100은 배경으로만 사용하고 텍스트 색으로 사용하지 않는다.
```

### 3.2 Gray Palette

Y&A Suite의 대부분 화면은 아래 그레이스케일을 사용한다.

| Token | HEX | 용도 |
| :--- | :--- | :--- |
| `gray.0` | `#FFFFFF` | 기본 배경 |
| `gray.25` | `#FAFAFA` | 페이지 보조 배경 |
| `gray.50` | `#F7F7F7` | 섹션 배경, table header |
| `gray.100` | `#F0F0F0` | hover background |
| `gray.200` | `#E5E5E5` | 기본 border |
| `gray.300` | `#D4D4D4` | 강한 border, disabled border |
| `gray.400` | `#A3A3A3` | placeholder, disabled text |
| `gray.500` | `#737373` | 보조 텍스트 |
| `gray.600` | `#515151` | CI gray, 아이콘/보조 강조 |
| `gray.700` | `#3F3F3F` | 본문 텍스트 |
| `gray.800` | `#2F2F2F` | 제목, 강한 텍스트 |
| `gray.900` | `#1F1F1F` | 최상위 제목 |

권장 사용:

```txt
Page background: gray.25 또는 gray.0
Surface: gray.0
Table header: gray.50
Border: gray.200
Body text: gray.700
Heading: gray.800 또는 gray.900
Secondary text: gray.500 또는 gray.600
Disabled text: gray.400
```

## 4. Semantic Colors

상태 색상은 서비스별 개성을 만들기 위한 색이 아니라, 업무 상태를 빠르게 이해하기 위한 보조 신호이다.

| 상태 | Text | Background | Border |
| :--- | :--- | :--- | :--- |
| Success | `#166534` | `#F0FDF4` | `#BBF7D0` |
| Warning | `#92400E` | `#FFFBEB` | `#FDE68A` |
| Danger | `red.700` | `red.50` | `red.200` |
| Info | `#1D4ED8` | `#EFF6FF` | `#BFDBFE` |
| Neutral | `gray.700` | `gray.50` | `gray.200` |

상태 표현 규칙:

```txt
색상만으로 상태를 구분하지 않는다.
항상 텍스트 라벨을 함께 제공한다.
위험/삭제/반려 계열은 red 계열을 사용한다.
서비스 구분 색과 상태 색을 섞지 않는다.
```

## 5. 서비스별 색상 사용 원칙

서비스별 컬러를 따로 강하게 만들지 않는다. Y&A Suite의 정체성은 공통 그레이스케일과 CI Red에서 나온다.

서비스 구분은 다음 요소로만 처리한다.

```txt
서비스명
아이콘
작은 배지
사이드바 active indicator
도메인별 로고 텍스트
```

권장:

```txt
Y&A Hub        -> Y&A Red accent
Y&A Dev        -> Gray + Red accent
Y&A Work       -> Gray + Red accent
Y&A M&A        -> Gray + Red accent
Y&A Project    -> Gray + Red accent
Y&A Fund       -> Gray + Red accent
Y&A Management -> Gray + Red accent
```

즉, 서비스마다 완전히 다른 컬러 테마를 만들지 않는다.

## 6. 타이포그래피

한글 업무 시스템에서는 가독성과 숫자 정렬이 중요하다.

권장 폰트:

```txt
Primary: Pretendard
Fallback: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
Mono: "SFMono-Regular", Consolas, "Liberation Mono", monospace
```

타입 스케일:

| Token | Size | Line Height | 용도 |
| :--- | :--- | :--- | :--- |
| `text-xs` | 12px | 16px | 배지, 보조 설명 |
| `text-sm` | 13px | 18px | 테이블, 조밀한 폼 |
| `text-base` | 14px | 20px | 기본 본문, 입력값 |
| `text-md` | 15px | 22px | 섹션 설명 |
| `text-lg` | 18px | 26px | 페이지 소제목 |
| `text-xl` | 22px | 30px | 페이지 제목 |
| `text-2xl` | 28px | 36px | 대시보드 상위 제목 |

업무 화면 기본값:

```txt
Body: 14px
Table cell: 13px
Form label: 13px
Input value: 14px
Badge: 12px
Page title: 22px
```

주의:

```txt
업무 앱 내부에서 hero-scale 타이포그래피를 사용하지 않는다.
letter-spacing은 기본 0을 유지한다.
작은 텍스트를 red.500 이하 밝기로 표시하지 않는다.
```

## 7. Spacing and Density

Y&A Suite는 업무 밀도가 필요한 시스템이므로 지나치게 큰 여백을 피한다. 기본 spacing은 4px grid를 사용한다.

| Token | Value |
| :--- | :--- |
| `space.1` | 4px |
| `space.2` | 8px |
| `space.3` | 12px |
| `space.4` | 16px |
| `space.5` | 20px |
| `space.6` | 24px |
| `space.8` | 32px |
| `space.10` | 40px |

화면 밀도:

| Density | 용도 | 기준 |
| :--- | :--- | :--- |
| Compact | 테이블, 관리자 화면, 권한 매트릭스 | 작은 여백, 높은 정보량 |
| Comfortable | 폼, 상세 화면, 모바일 | 적당한 여백, 터치 안정성 |

권장 규격:

```txt
Desktop input height: 36px
Desktop compact button: 32px
Default button: 36px
Mobile button/input: 40px 이상
Table row compact: 40px
Table row comfortable: 44px
Table header: 36px
Toolbar height: 48px
Sidebar width: 240px
Collapsed sidebar: 64px
Page horizontal padding desktop: 24px
Page horizontal padding mobile: 16px
```

## 8. Radius, Border, Shadow

업무형 UI에서는 둥근 카드와 그림자를 과하게 쓰지 않는다.

| Token | Value | 용도 |
| :--- | :--- | :--- |
| `radius.sm` | 4px | input, badge |
| `radius.md` | 6px | button, select, small panel |
| `radius.lg` | 8px | dialog, repeated card |

규칙:

```txt
카드 radius는 최대 8px를 기본으로 한다.
페이지 섹션을 카드처럼 감싸지 않는다.
중첩 카드를 만들지 않는다.
shadow는 dropdown, popover, dialog에만 제한적으로 사용한다.
기본 구분은 shadow보다 border를 우선한다.
```

## 9. Layout

### 9.1 Desktop

```txt
Left Sidebar + Topbar + Content
```

권장:

```txt
Sidebar: 240px
Topbar: 56px
Content max width: 화면 성격에 따라 fluid
List/Table page: full width
Form page: 960px 내외
Detail page: 1120px 내외
```

### 9.2 Tablet

```txt
Collapsible Sidebar + Content
```

권장:

```txt
Sidebar는 접힘 상태를 기본 지원한다.
테이블은 컬럼 숨김 또는 상세 패널 전환을 지원한다.
필터는 2열 이하로 줄인다.
```

### 9.3 Mobile

```txt
Top Appbar + Drawer Navigation + Content
```

권장:

```txt
복잡한 테이블은 카드형 리스트 또는 핵심 컬럼만 노출한다.
대량 편집은 모바일에서 제한한다.
승인/반려/코멘트 같은 간단 액션을 우선 제공한다.
```

## 10. Core Components

공통 컴포넌트는 `packages/ui`에서 관리한다.

> 구현 방침(Phase 1.5 확정, 이슈20): 외부 UI 패키지(Radix/TanStack Table 등) 없이 **네이티브로 직접 구현**한다. 인터랙티브 컴포넌트는 실제 소비 화면이 생기는 Phase에 그때그때 추가한다 — Phase 1 종료 시점 기준 Select/Switch/Table/ConfirmDialog는 네이티브로 구현되었고, SearchCombobox(MasterSearchPicker로 대체 구현)/DatePicker(datetime-local 사용)/Sheet/Popover/Tooltip/DataTable은 아직 없다. 복잡한 접근성·가상 스크롤 요구가 생기면 외부 패키지 도입을 재검토한다.

```txt
packages/ui/
  components/
    button/
    input/
    select/
    textarea/
    checkbox/
    radio-group/
    switch/
    tabs/
    dialog/
    sheet/
    popover/
    tooltip/
    table/
    data-table/
    filter-bar/
    form-field/
    status-badge/
    empty-state/
    page-header/
    app-shell/
    sidebar/
    topbar/
  tokens/
    colors.ts
    typography.ts
    spacing.ts
    radius.ts
    shadows.ts
  styles/
    globals.css
```

필수 컴포넌트 (구현 시점은 실제 소비 Phase 기준 — 위 구현 방침 참고):

```txt
Button          (구현됨)
IconButton      (구현됨)
Input           (구현됨)
Select          (구현됨 — 네이티브)
SearchCombobox  (MasterSearchPicker로 대체 구현 — 검색 API 디바운스 자동완성)
DatePicker      (미구현 — datetime-local 입력 사용 중, 필요 시 추가)
Dialog          (구현됨 — 네이티브)
Sheet           (미구현 — 소비 화면 생기면 추가)
DataTable       (미구현 — 네이티브 Table로 대응 중, 정렬/가상스크롤 필요 시 추가)
FilterBar       (구현됨)
StatusBadge     (구현됨)
PermissionBadge (구현됨)
PageHeader      (구현됨)
EmptyState      (구현됨)
ConfirmDialog   (구현됨 — 네이티브)
BulkActionBar   (구현됨)
```

Y&A 특화 컴포넌트 (비즈니스 결합형):

```txt
[packages/master-data 또는 개별 apps/* 소유]
- StartupPicker, ExpertPicker, PartnerPicker, ManagerPicker (API 결합형 검색 셀렉터)
- MergeCandidateCard (병합 후보 상세 비교 및 승인 액션 컴포넌트)

[packages/permissions 또는 apps/dev 소유]
- PermissionMatrix (권한 매핑 테이블)
- DomainAccessSwitch (도메인 권한 스위치)

[packages/ui 소유 - 순수 프레젠테이션형 특화 컴포넌트]
- MasterCodeBadge (마스터 코드 표시 배지)
- AuditTimeline (데이터 필드 변경/감사 타임라인 UI - 데이터 주입형)
```

주의:

```txt
StartupPicker, ExpertPicker 등 API 호출 및 캐싱(React Query)을 수반하는 특화 컴포넌트는 packages/ui가 아닌 비즈니스 도메인 패키지나 해당 apps/* 내에서 별도 구현한다.
packages/ui는 오직 껍데기 UI 스타일과 렌더링에만 집중한다.
```

## 11. Button Rules

버튼은 의미별로 제한해서 사용한다.

| Variant | 용도 |
| :--- | :--- |
| Primary | 저장, 생성, 승인 등 주요 액션 |
| Secondary | 보조 액션 |
| Outline | 취소보다 약한 보조 액션 |
| Ghost | 테이블 행 액션, 툴바 액션 |
| Danger | 삭제, 반려, 회수 |

색상:

```txt
Primary background: red.500
Primary hover: red.600
Primary active: red.700
Secondary/Outline: gray scale
Danger: red.700 또는 red.800
```

크기:

```txt
sm: 32px
md: 36px
lg: 40px
mobile: 40px 이상
```

규칙:

```txt
한 화면의 primary button은 가능한 하나만 둔다.
삭제/반려는 항상 confirm dialog를 거친다.
아이콘만 있는 버튼은 tooltip 또는 aria-label을 제공한다.
```

## 12. Table Rules

Y&A Suite는 테이블 중심 업무가 많으므로 테이블 규격을 고정한다.

기본:

```txt
Header height: 36px
Row height compact: 40px
Row height comfortable: 44px
Cell padding x: 12px
Cell font size: 13px
Header background: gray.50
Border: gray.200
Hover: gray.50 또는 gray.100
Selected row: red.25
```

규칙:

```txt
숫자는 오른쪽 정렬한다.
날짜는 YYYY-MM-DD를 기본으로 한다.
상태는 StatusBadge로 표시한다.
긴 텍스트는 말줄임 후 tooltip 또는 상세 패널에서 전체를 보여준다.
모바일에서는 핵심 컬럼만 남기거나 카드 리스트로 전환한다.
```

## 13. Form Rules

폼은 사용자가 실수 없이 입력하는 것이 중요하다.

기본:

```txt
Label: 13px, gray.700
Input height: 36px desktop, 40px mobile
Helper text: 12px, gray.500
Error text: 12px, red.700
Required mark: red.500
```

규칙:

```txt
필수값은 label 옆에 표시한다.
에러는 필드 아래에 바로 표시한다.
placeholder를 label 대체로 사용하지 않는다.
저장 전 validation을 수행한다.
긴 폼은 FormSection으로 나눈다.
```

## 14. Accessibility and KS Alignment

Y&A Suite는 한국산업표준의 인간중심 설계, 사용성, 접근성 취지를 따르는 것을 목표로 한다. 실제 인증이나 공식 적합성 판단은 별도 심사 대상이므로, 본 문서는 제품 구현 기준으로 사용한다.

참조 방향:

```txt
인간중심 설계: ISO 9241-210 계열 원칙
사용성 정의/평가: ISO 9241-11 계열 원칙
웹 접근성: ISO/IEC 40500 및 WCAG 계열 원칙
```

실무 기준:

```txt
일반 텍스트 대비: 최소 4.5:1
큰 텍스트/굵은 텍스트 대비: 최소 3:1
UI 컴포넌트 경계와 상태 표시: 최소 3:1 권장
키보드 포커스 표시: 항상 제공
포커스 링은 2px 이상으로 명확하게 표시
포인터 입력 대상은 최소 24px 이상, 모바일 주요 액션은 40px 이상 권장
색상만으로 정보를 전달하지 않음
모든 아이콘 버튼에 aria-label 또는 tooltip 제공
```

Y&A Red 대비 참고:

```txt
#E22213 on white: 약 4.70:1
#C91E11 on white: 약 5.71:1
#B31A0F on white: 약 6.84:1
#515151 on white: 약 7.94:1
```

따라서 작은 텍스트 강조는 `red.600` 이상을 우선 사용한다.

## 15. Design Governance

UI가 망가지는 가장 큰 이유는 화면마다 임의 구현이 늘어나는 것이다. 따라서 다음 규칙을 둔다.

1. 새 화면은 반드시 `packages/ui`의 컴포넌트를 우선 사용한다.
2. 새 색상은 임의로 추가하지 않고 token에 등록한다.
3. 서비스별 전용 컴포넌트가 2개 앱 이상에서 필요해지면 `packages/ui` 또는 관련 공통 패키지로 이동한다.
4. 테이블, 폼, 필터, 모달은 앱별로 새로 만들지 않는다.
5. 디자인 리뷰 체크리스트를 통과하지 못한 화면은 배포하지 않는다.

체크리스트:

```txt
색상 토큰만 사용했는가?
Primary action이 한 화면에 과하게 많지 않은가?
테이블 row height와 cell padding이 규격을 지켰는가?
모바일에서 텍스트와 버튼이 겹치지 않는가?
키보드 포커스가 보이는가?
상태를 색상만으로 표시하지 않았는가?
카드 안에 카드를 넣지 않았는가?
불필요한 shadow나 장식 요소가 없는가?
```

## 16. 최종 요약

Y&A Suite의 디자인 시스템은 다음 방향을 따른다.

```txt
기본 UI: 그레이스케일
포인트/활성 컬러: #E22213
보조 CI 컬러: #515151
형태: compact한 업무형 SaaS
컴포넌트: packages/ui에서 중앙 관리
접근성: 대비, 포커스, 터치 영역, 텍스트 라벨 준수
서비스별 차이: 색상 테마가 아니라 정보 구조와 아이콘으로 표현
```

디자인 시스템의 목적은 예쁜 화면을 많이 만드는 것이 아니라, 모든 서비스가 같은 규칙 안에서 안정적으로 확장되게 하는 것이다.

## 17. 참고 기준

```txt
ISO 9241-210: 인간중심 설계 원칙
ISO 9241-11: 사용성 정의와 개념
ISO/IEC 40500: W3C WCAG 2.0 기반 웹 접근성 표준
WCAG 2.2: 색상 대비, 포커스, 포인터 입력 기준 참고
```
