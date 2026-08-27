# ROUGE·QC — 화장품 원재료 품질관리 시스템

품질팀(QA/QC)이 원재료 정보·규제·품질문서를 통합 관리하는 사내 웹 시스템입니다.
정적 사이트(HTML) + Firebase(Firestore/Storage) 구조로, GitHub Pages에 무료 배포됩니다.

- 테마: 루즈 레드 & 웜 화이트 / 폰트: Pretendard + JetBrains Mono(과학 코드)
- 다크모드, 모바일 반응형, 실시간 클라우드 동기화 지원

---

## 1. Firebase 연결 (5분)

1. [Firebase Console](https://console.firebase.google.com) → **프로젝트 만들기**
2. **빌드 → Firestore Database** 생성 (프로덕션/테스트 모드 선택)
3. **빌드 → Authentication → 로그인 방법**에서 **익명(Anonymous)** 사용 설정
4. 프로젝트 설정(⚙️) → **내 앱 → 웹 앱 추가(</>)** → 나오는 `firebaseConfig` 값 복사
5. `index.html` 상단 `firebaseConfig = { ... }` 안에 값 붙여넣기
   → 값을 채우면 좌측 하단 표시가 **"Firebase 연결됨 (실시간)"** 으로 자동 전환됩니다.
   (비워 두면 내장 데모 데이터로 동작하므로 배포 전 미리보기가 가능합니다.)

### Firestore 데이터 경로
```
artifacts / rouge-qc-material / public / data / materials  (컬렉션)
```
문서 필드: `name, inci, cas, supplier, func, limit, status, certs[], docs{coa,msds,spec}, allergen, restrict, country, retest, views, updatedAt`

### 보안 규칙(권장 초안) — 사내 인증 사용자만 읽기/쓰기
```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /artifacts/rouge-qc-material/public/data/{doc=**} {
      allow read, write: if request.auth != null;   // 익명 포함 로그인 사용자
    }
  }
}
```
> 실제 운영 시에는 익명 로그인 대신 **사내 이메일(Google Workspace) 도메인 제한**으로 강화하는 것을 권장합니다.

---

## 2. GitHub 배포 (GitHub Pages)

```bash
cd qa-material-system
git init
git add .
git commit -m "ROUGE-QC 품질관리 시스템 초기 배포"
git branch -M main
git remote add origin https://github.com/<계정>/<저장소>.git
git push -u origin main
```
GitHub 저장소 → **Settings → Pages → Branch: main / (root)** 저장
→ 몇 분 뒤 `https://<계정>.github.io/<저장소>/` 로 공개됩니다.

> ⚠️ Firebase Console → **Authentication → Settings → 승인된 도메인**에 위 GitHub Pages 주소를 추가해야 로그인이 동작합니다.
> ⚠️ `apiKey`는 웹앱에서 공개되어도 되는 값이지만, **저장소를 Private로 두거나** 보안 규칙으로 접근을 통제하세요.

---

## 3. 다음 단계 (선택 확장)
- 파일 업로드 실연동: Firebase **Storage** 추가 후 COA/MSDS 실제 저장
- 원재료 **상세 페이지**(성분 이력·Lot별 COA·변경관리)
- 사내 이메일 로그인 + 역할(등록자/승인자) 권한 분리
- 재평가 임박 **이메일/슬랙 자동 알림**(Cloud Functions)

---

## 점검 도구 (43종 판정 관리용)

원료별 43종 문서 판정을 유지·보수할 때 쓰는 스크립트다.
모두 `index.html` 하나만 있으면 돌아간다.

### 준비 — 데이터 추출
```
python extract_module.py
```
`index.html` 안의 `DEMO` / `DEMO_AUTO` / `DOC43` / `DOC43_STATUS` 를 `extracted.mjs` 로 뽑아낸다.
아래 검증·점검 도구는 이 파일을 읽는다. **index.html 을 수정했으면 다시 실행할 것.**

### ① 데이터 무결성 검증
```
node validate.mjs
```
코드 중복, DOC43 항목명 오타, have/check/na 중복 배정, fileCount 대조,
**storage 필수키 7개(expiryDate·expiryLot·expirySrc·temp·text·source·shelfLife)** 누락을 검사한다.
판정을 고친 뒤에는 항상 이걸 통과시킨 다음 저장한다.

### ② 판정 현황 점검
```
node doc43_audit.mjs                 전체 요약 + 보유율 하위 10건
node doc43_audit.mjs HALAL           HALAL 보유 원료 목록
node doc43_audit.mjs HALAL --check   HALAL 확인필요 원료와 사유
node doc43_audit.mjs --low 50        보유율 50% 미만 원료
node doc43_audit.mjs --gaps          확인필요가 몰린 항목 순위
```
**`--gaps` 로 공급사에 일괄 요청할 항목을 추린다.**
(2026-08 기준 상위: HALAL 43건 · EUDR 24건 · RSPO 21건 · VEGAN 16건)

### ③ 유효기간 만료 확인서 찾기
```
python extract_pdfs.py "<원료폴더>" "%TEMP%\qa_text\<코드>.txt"
python expiry_scan.py "%TEMP%\qa_text"
python expiry_scan.py "%TEMP%\qa_text" 610022 610762     특정 원료만
python expiry_scan.py --demo                              자체 점검
```
공급사 확인서에는 **유효기간이 파일명에만 있는 경우, 본문에만 있는 경우,
구판에는 없다가 개정판에서 새로 생긴 경우**가 뒤섞여 있어 육안으로는 놓치기 쉽다.
파일명(`유효기간`·`until`·`valid`·`만료`·날짜)과
본문(`valid for one year`·`Valid till`·`Expiry Date`·`Berlaku sampai`·`new application is required`)을
함께 훑어 후보를 뽑는다.

**출력은 후보일 뿐이므로 반드시 원문을 열어 발행일과 기간을 직접 확인한다.**
BASF 서식의 `valid until superseded by a later version`(개정판까지 유효)처럼
만료 조항이 아닌 표현은 따로 표시된다.

> 실제 적발 사례 — 할랄 인증서 만료 4건, 공급사 선언서 "1년 유효" 조항 5건,
> 선언서 만료일 직접 명시 1건. 모두 '보유'로 등록돼 있던 항목이었다.
