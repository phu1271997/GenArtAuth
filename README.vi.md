# GenArtAuth — Trợ lý phát hiện gian lận NFT / tác phẩm số bằng AI trên GenLayer

> Bản tóm tắt tiếng Việt. Tài liệu đầy đủ ở [README.md](./README.md), kiến trúc ở [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md), API contract ở [docs/API.md](./docs/API.md), kinh tế + reputation ở [docs/ECONOMICS.md](./docs/ECONOMICS.md), threat model ở [docs/SECURITY.md](./docs/SECURITY.md).

- **Contract Studionet (Milestone 6):** `0x5e85C3319FA74948d753168a38d6b510C3E4FC9e`
- **Live app:** https://genartauth-app.vercel.app/
- **Explorer:** https://genlayer-explorer.vercel.app/address/0x5e85C3319FA74948d753168a38d6b510C3E4FC9e

## Vấn đề

Thị trường NFT tràn ngập các bản mint copy, tái mint, dùng lại art của người khác. Không có oracle nào đọc web trực tiếp trên chain để xác thực tác phẩm số là bản gốc hay đạo nhái.

## Vì sao GenLayer

GenArtAuth **chết** nếu không có GenLayer, vì:

1. **Đọc web on-chain**: `gl.nondet.web.render` crawl trực tiếp trang OpenSea + DeviantArt + Wayback Machine ngay trong hàm contract. Solidity không làm được.
2. **Phán quyết chủ quan**: quyết định ORIGINAL vs COPY cần LLM đọc metadata + timeline + so sánh nội dung. Solidity không có LLM tại tầng đồng thuận.
3. **Đồng thuận theo ý nghĩa**: `gl.eq_principle.prompt_comparative` cho phép hai validator viết `reason` khác nhau nhưng chốt cùng verdict. Chuỗi khác đòi hai validator ra byte giống hệt — không tưởng với LLM.

## Trust Layer v1 (Milestone 6 + 6.1) — điểm nổi bật

- **Reputation on-chain**: mỗi address giữ điểm ELO (khởi đầu 1000, floor 0) + 5 counter monotonic. Update tự động ở `resolveChallenge`.
- **AI đa góc nhìn**: prompt bắt buộc validator luận theo 3 góc — Forensic + Provenance + Skeptic. Principle kiểm tra reason phủ đủ 3.
- **Phòng thủ prompt injection**: sentinel do-not-echo + delimiter `<<<UNTRUSTED>>>` bọc mọi nội dung crawled. Nếu output leak sentinel → reject trước khi ghi state.
- **Trust Leaderboard**: page mới xếp hạng participants theo score với medal + tier badge + treasury slashed.
- **Onboarding modal 4 bước**: giới thiệu quy trình cho người dùng lần đầu, dismiss localStorage.
- **Error handling**: ErrorBoundary + extractor unwrap revert message (thay vì raw JSON-RPC dump).
- **Docs đầy đủ**: ARCHITECTURE.md (Mermaid), API.md, ECONOMICS.md, SECURITY.md, CONTRIBUTING.md, sample data JSON.

## Kinh tế nhanh

| Hành động | Trả | Số tiền |
|---|---|---|
| `submitArtwork` | Người submit | 5 GEN bond |
| `challengeVerdict` | Người thách thức | 10 GEN stake |
| Overturn | Contract → challenger | 15 GEN (stake + bond) |
| Uphold | Contract → submitter | 5 GEN (refund bond); stake vào treasury |

Contract **không bao giờ trả nhiều hơn số đã nhận** — mọi payout đều được collateralise đầy đủ trước resolve.

## Chạy local

```bash
git clone https://github.com/phu1271997/GenArtAuth.git
cd GenArtAuth

# Contract test
pip install genlayer-test
python3 -m pytest tests/ -v   # 14 tests pass

# Frontend
cd frontend
npm install
npm run dev   # http://localhost:3000
```

## Deploy contract lên Studionet

1. Mở https://studio.genlayer.com/run-debug.
2. Settings → **Reset Storage** → Confirm → hard refresh (Cmd+Shift+R).
3. Paste `contracts/gen_art_auth.py` → Compile → Deploy.
4. Click tx → xác nhận **`Result: SUCCESS`** (không chỉ `FINALIZED`).
5. Copy contract address → dán vào `NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS` trên Vercel + `frontend/.env.local`.
6. Nạp GEN cho ví demo từ Studio **Accounts** panel (không phải từ testnet faucet — Studionet và Testnet là hai chain riêng biệt).

## Lịch sử milestone

- **Milestone 6.1** (2026-08): UX & ecosystem bundle — Leaderboard, ErrorBoundary, revert extractor, onboarding, sample data.
- **Milestone 6** (2026-08): Trust Layer v1 — reputation on-chain, multi-perspective AI, prompt-injection defense, docs bundle.
- **Milestone 5** (2026-07): reviewer-requested redeploy + Studionet lock-in.
- **Milestone 4** (2026-07): submitter bond + solvent dispute economics.
- **Milestone 3** (2026-07): frontend polish + test suite.
- **Milestone 2** (2026-06): dispute & challenge flow.
- **Milestone 1** (2026-06): semantic consensus + Wayback Machine crawling.

Chi tiết đầy đủ ở [CHANGELOG.md](./CHANGELOG.md).
