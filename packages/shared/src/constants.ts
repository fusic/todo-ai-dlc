// CMP-003 Shared Contract — 制約定数の単一定義（RF-03 / BR-001 / BR-002）
// プロダクションコード内の 200 / 1000 リテラルはこのファイルの 1 箇所のみ。
// テストコード内の境界値リテラルは独立検証点として直書きを維持する（functional-design Q3=a）。

/** title の最大文字数（BR-001 — ENT-001.title） */
export const TITLE_MAX_LENGTH = 200;

/** description の最大文字数（BR-002 — ENT-001.description） */
export const DESCRIPTION_MAX_LENGTH = 1000;
