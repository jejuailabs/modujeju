# VisitJeju 이미지 제공 및 현재 연결 상태

확인일: **2026-11-08 (KST)**. 공식 웹페이지를 컴퓨터 유즈로 확인하고, 이전에 확보한 공식 API 가이드 V1.1(2026.6)의 응답 명세를 읽었다. 이 기록은 실제 API 호출 성공이나 이미지 이용권 승인을 뜻하지 않는다.

## 제공되는 이미지

비짓제주에는 장소 사진이 있으며 공식 API에도 대표 이미지 정보가 정의되어 있다. [공식 API 안내](https://www.visitjeju.net/kr/visitjejuapi), [공식 활용가이드 PDF](https://api.visitjeju.net/file/bbsattachment/filepath/202606/15/2f62f5a7-9d71-4d0c-a43c-54321cd4b06b.pdf)

| 응답 필드 | 공식 명세의 의미 |
| --- | --- |
| `repPhoto.descseo` | 검색엔진최적화 키워드 |
| `repPhoto.photoid.photoid` | 사진 ID |
| `repPhoto.photoid.imgpath` | 일반 이미지 경로 |
| `repPhoto.photoid.thumbnailpath` | 썸네일 이미지 경로 |

위 필드는 PDF 응답 명세와 예시에 있는 필드다. 명세에는 해당 사진의 개별 라이선스를 확정할 필드가 없으므로 URL이 반환된다는 사실만으로 모든 재사용 조건이 충족됐다고 판단하지 않는다.

[허니문하우스 공식 상세](https://www.visitjeju.net/kr/detail/view?contentsid=CNTS_200000000009011)에서 갤러리 5장과 본문 사진을 확인했다. 첫 갤러리 이미지의 공개 DOM `src`는 `https://api.cdn.visitjeju.net/photomng/imgpath/201908/01/051680b9-2fe5-4670-b6e9-c5bc1e6220a0.webp`였다. 이 URL은 존재 확인용 기록이며 사용 허가나 앱 게시 승인을 뜻하지 않는다.

## 현재 앱의 상태

- 현재 공개 목록은 공식 페이지에서 확보한 로컬 60곳 자료를 사용한다. 실제 API로 자동 수집하는 상태가 아니다.
- `src/lib/visitjeju/normalize.ts`는 `repPhoto.photoid.imgpath`를 검증한 뒤 `candidatePhotoUrl`로만 보관한다. `thumbnailpath`는 현재 보관하지 않는다.
- 자동 정규화의 공개 `image`는 placeholder다. `src/lib/sync/merge.ts`와 `src/lib/sync/public-catalog.ts`도 검수되지 않은 원본 사진을 자동 공개하지 않는다.
- 공식 API 안내는 키가 필요하며 담당자 승인 후 이메일로 발급한다고 설명한다. 현재 실제 API 키와 발급 조건의 확인은 끝나지 않았다. 코드가 존재한다는 사실을 실제 연결 완료로 표시하면 안 된다.

## 사진별 이용 조건

[VisitJeju 일반 이용약관](https://www.visitjeju.net/kr/common/terms) 제14조에는 게시 자료의 상업적 이용 제한과 무단 복제·배포 제한이 있다. 반면 별도 [PhotoJEJU 저작권사용범위](https://www.visitjeju.net/photojeju/ccl) 안내는 CC BY, CC BY-ND, CC BY-SA에 해당하는 사진의 상업적 이용을 허용하고, 저작자·출처 표시 및 각 라이선스의 변경 조건을 설명한다. 일반 약관만으로 모든 사진을 사용 불가라고 단정하거나, API 제공만으로 모든 사진을 사용 가능하다고 단정하지 않는다.

- 허니문하우스 상세 화면에서는 사진별 재사용 라이선스를 확인하지 못했다. PhotoJEJU의 `허니문하우스` + 저작자표시(BY) 필터 검색 결과는 0건이었다.
- [PhotoJEJU 함덕해수욕장 사진 4716](https://www.visitjeju.net/photojeju/category?cntId=4716)은 작가 홍순병, 촬영일 2011-01-01, 3,000 × 1,624 크기로 표시됐고 사용범위는 **BY-NC-ND**였다. 상업 앱에 사용 가능한 사진으로 제시하면 안 된다.
- PhotoJEJU에는 사용범위(CCL) 필터가 있어 허용 라이선스 사진을 찾을 수 있다. 이번 조사에서는 현재 카탈로그 장소와 일치하는 상업 이용 허용 사진을 확정하지 못했다.
- 일반 이용약관 제17조는 사이트 가입비·이용요금이 무료라고 안내한다. 이것만으로 API 전용 계약, 호출 한도, 초과 조건, 별도 저장·호스팅 비용까지 확인됐다고 해석하지 않는다.

## 이번 작업의 실행 범위

공개 웹페이지 읽기와 기존 로컬 코드·가이드 검토만 수행했다. 실제 관광정보 API 호출, 키 발급·확인 요청, 신청서 제출, 이미지 파일 다운로드·앱 재배포, 클라우드 쓰기, 배포는 수행하지 않았다. 이미지 이용 허가나 유료 서비스 이용 승인을 새로 받은 사실도 없다.
