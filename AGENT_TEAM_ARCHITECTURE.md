# 🤖 PopPay エージェントチーム開発アーキテクチャ

## 🎯 設計原則

### AIエージェント向け設計哲学
1. **Single Responsibility Principle (SRP)** - 各ファイル/フォルダは1つの責任のみ
2. **Interface Segregation** - 明確で小さなインターフェース
3. **Dependency Inversion** - 抽象化に依存、具象に依存しない
4. **Convention over Configuration** - 規約による開発効率化
5. **Self-Documenting Code** - コードが仕様書になる

## 📁 推奨ディレクトリ構造

```
poppay/
├── .agents/                      # エージェント設定とテンプレート
│   ├── workflows/               # エージェント実行フロー定義
│   │   ├── payment-flow.yaml
│   │   ├── testing-pipeline.yaml
│   │   └── deployment.yaml
│   ├── prompts/                 # エージェント用プロンプト
│   │   ├── code-review.md
│   │   ├── testing.md
│   │   └── deployment.md
│   └── templates/               # コード生成テンプレート
│       ├── api-route.template
│       ├── component.template
│       └── test.template
│
├── docs/                        # ドキュメント
│   ├── api/                     # API仕様書
│   │   ├── openapi.yaml
│   │   └── schemas/
│   ├── architecture/            # アーキテクチャ図
│   │   ├── system-flow.md
│   │   ├── payment-sequence.md
│   │   └── database-erd.md
│   ├── development/             # 開発ガイド
│   │   ├── agent-development.md
│   │   ├── testing-strategy.md
│   │   └── deployment-guide.md
│   └── decisions/               # ADR (Architecture Decision Records)
│       ├── 001-tech-stack.md
│       ├── 002-payment-flow.md
│       └── 003-testing-strategy.md
│
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── (admin)/             # 管理者グループ
│   │   │   ├── dashboard/       # ダッシュボード
│   │   │   ├── payments/        # 決済管理
│   │   │   └── history/         # 履歴管理
│   │   ├── api/                 # API Routes
│   │   │   ├── v1/              # API バージョニング
│   │   │   │   ├── payments/
│   │   │   │   │   ├── create/route.ts
│   │   │   │   │   ├── status/route.ts
│   │   │   │   │   └── cancel/route.ts
│   │   │   │   └── webhooks/
│   │   │   │       └── paypay/route.ts
│   │   │   └── health/route.ts  # ヘルスチェック
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   │
│   ├── components/              # UIコンポーネント
│   │   ├── ui/                  # 基本UIコンポーネント
│   │   │   ├── button/
│   │   │   ├── input/
│   │   │   ├── modal/
│   │   │   └── qr-code/
│   │   ├── forms/               # フォーム関連
│   │   │   ├── payment-form/
│   │   │   └── validation/
│   │   ├── layout/              # レイアウト関連
│   │   │   ├── header/
│   │   │   ├── footer/
│   │   │   └── navigation/
│   │   └── payment/             # 決済関連UI
│   │       ├── qr-display/
│   │       ├── status-indicator/
│   │       └── payment-history/
│   │
│   ├── core/                    # ビジネスロジック層
│   │   ├── domain/              # ドメインモデル
│   │   │   ├── entities/
│   │   │   │   ├── payment.ts
│   │   │   │   ├── transaction.ts
│   │   │   │   └── tenant.ts
│   │   │   ├── value-objects/
│   │   │   │   ├── amount.ts
│   │   │   │   ├── payment-id.ts
│   │   │   │   └── qr-code.ts
│   │   │   └── repositories/
│   │   │       ├── payment.repository.ts
│   │   │       └── transaction.repository.ts
│   │   ├── application/         # アプリケーションサービス
│   │   │   ├── services/
│   │   │   │   ├── payment.service.ts
│   │   │   │   ├── notification.service.ts
│   │   │   │   └── audit.service.ts
│   │   │   ├── use-cases/
│   │   │   │   ├── create-payment.use-case.ts
│   │   │   │   ├── check-status.use-case.ts
│   │   │   │   └── cancel-payment.use-case.ts
│   │   │   └── dtos/
│   │   │       ├── payment.dto.ts
│   │   │       └── transaction.dto.ts
│   │   └── infrastructure/      # インフラストラクチャ層
│   │       ├── database/
│   │       │   ├── supabase/
│   │       │   │   ├── client.ts
│   │       │   │   ├── migrations/
│   │       │   │   └── seeds/
│   │       │   └── repositories/
│   │       │       ├── supabase-payment.repository.ts
│   │       │       └── supabase-transaction.repository.ts
│   │       ├── external/
│   │       │   ├── paypay/
│   │       │   │   ├── client.ts
│   │       │   │   ├── mapper.ts
│   │       │   │   └── types.ts
│   │       │   └── qr-generator/
│   │       │       ├── client.ts
│   │       │       └── types.ts
│   │       └── config/
│   │           ├── environment.ts
│   │           ├── database.ts
│   │           ├── paypay.ts
│   │           └── logging.ts
│   │
│   ├── shared/                  # 共通機能
│   │   ├── types/               # 型定義
│   │   │   ├── api.types.ts
│   │   │   ├── domain.types.ts
│   │   │   └── ui.types.ts
│   │   ├── utils/               # ユーティリティ
│   │   │   ├── validation.ts
│   │   │   ├── formatting.ts
│   │   │   ├── crypto.ts
│   │   │   └── date.ts
│   │   ├── constants/           # 定数
│   │   │   ├── payment.constants.ts
│   │   │   ├── api.constants.ts
│   │   │   └── ui.constants.ts
│   │   ├── hooks/               # カスタムフック
│   │   │   ├── use-payment.ts
│   │   │   ├── use-polling.ts
│   │   │   └── use-validation.ts
│   │   └── middleware/          # ミドルウェア
│   │       ├── auth.middleware.ts
│   │       ├── error.middleware.ts
│   │       └── logging.middleware.ts
│   │
│   └── __tests__/               # テスト
│       ├── __fixtures__/        # テストデータ
│       ├── __mocks__/           # モック
│       ├── __utils__/           # テストユーティリティ
│       ├── unit/                # 単体テスト
│       │   ├── core/
│       │   ├── components/
│       │   └── shared/
│       ├── integration/         # 統合テスト
│       │   ├── api/
│       │   ├── database/
│       │   └── external/
│       └── e2e/                 # E2Eテスト
│           ├── payment-flow.spec.ts
│           └── admin-dashboard.spec.ts
│
├── config/                      # 設定ファイル
│   ├── jest.config.ts           # テスト設定
│   ├── playwright.config.ts     # E2E設定
│   ├── eslint.config.ts         # リント設定
│   └── tailwind.config.ts       # スタイル設定
│
├── scripts/                     # 自動化スクリプト
│   ├── setup.sh                # 初期セットアップ
│   ├── test.sh                 # テスト実行
│   ├── deploy.sh               # デプロイ
│   └── db-migrate.sh           # DB移行
│
├── .env.example                 # 環境変数テンプレート
├── .agents.yaml                # エージェント設定
├── docker-compose.dev.yaml     # 開発環境
├── Dockerfile                  # 本番環境
├── package.json
├── README.md
└── tsconfig.json
```

## 🎯 各層の責任

### 1. **Domain Layer (ドメイン層)**
- **Entities**: ビジネスの核となる概念（Payment, Transaction）
- **Value Objects**: 値としてのオブジェクト（Amount, PaymentId）
- **Repositories**: データアクセスの抽象化

### 2. **Application Layer (アプリケーション層)**
- **Use Cases**: 具体的なビジネスユースケース
- **Services**: ドメイン横断的な処理
- **DTOs**: データ転送オブジェクト

### 3. **Infrastructure Layer (インフラストラクチャ層)**
- **Database**: データ永続化の実装
- **External**: 外部サービス連携
- **Config**: 設定管理

### 4. **Presentation Layer (プレゼンテーション層)**
- **Components**: UIコンポーネント
- **API Routes**: Web API実装
- **Hooks**: React状態管理

## 🤖 エージェントチーム開発のメリット

### 1. **明確な責任分界**
- 各エージェントが特定のディレクトリ/機能に集中
- APIエージェント → `src/app/api/`
- UIエージェント → `src/components/`
- ビジネスロジックエージェント → `src/core/`

### 2. **並列開発可能**
- 各層が独立しているため、同時に複数エージェントが作業可能
- インターフェース（型定義）を先に確定することで依存関係を解決

### 3. **テスタビリティ**
- 各層に対応するテストファイルが明確
- モックが作りやすい構造
- 単体→統合→E2Eの段階的テスト

### 4. **保守性**
- 変更の影響範囲が限定的
- エージェントがファイルを探しやすい
- 自動化スクリプトによる品質保証

## 🔧 エージェント協調のための規約

### 1. **ファイル命名規約**
```
- Entity: payment.entity.ts
- Service: payment.service.ts
- Repository: payment.repository.ts
- Component: PaymentForm.tsx
- Hook: usePayment.ts
- Test: payment.service.test.ts
```

### 2. **インポート規約**
```typescript
// 1. 外部ライブラリ
import React from 'react';
import { NextRequest } from 'next/server';

// 2. 内部モジュール（相対パスより絶対パス優先）
import { PaymentService } from '@/core/application/services/payment.service';
import { PaymentEntity } from '@/core/domain/entities/payment';

// 3. 型定義（最後）
import type { PaymentDTO } from '@/core/application/dtos/payment.dto';
```

### 3. **型定義規約**
```typescript
// Interface（実装を強制）
export interface IPaymentRepository {
  create(payment: PaymentEntity): Promise<void>;
  findById(id: string): Promise<PaymentEntity | null>;
}

// Type（データ構造定義）
export type PaymentStatus = 'CREATED' | 'COMPLETED' | 'FAILED' | 'EXPIRED';

// DTO（レイヤー間データ転送）
export interface PaymentCreateDTO {
  amount: number;
  description: string;
}
```

## 📋 移行計画

### Phase 1: コア機能分離 (1週間)
1. `src/core/` 作成とビジネスロジック移行
2. `src/shared/` 作成と共通機能移行
3. 型定義統一

### Phase 2: UI/API分離 (1週間)
1. `src/components/` 整理
2. `src/app/api/v1/` APIバージョニング
3. エラーハンドリング統一

### Phase 3: テスト・品質向上 (1週間)
1. テスト構造整理
2. 自動化スクリプト作成
3. ドキュメント整備

### Phase 4: エージェント最適化 (継続)
1. `.agents/` 設定
2. ワークフロー定義
3. 運用改善

このアーキテクチャにより、複数のAIエージェントが並列でコード開発・テスト・デプロイを実行できる最高のプロジェクトになります。