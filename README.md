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
