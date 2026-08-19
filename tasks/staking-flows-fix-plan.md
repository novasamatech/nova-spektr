# Staking dashboard flows — parity & integration fix plan

Собрано 2026-08-12 из двух аудитов: статический (валидации/параметры/интеграции против старых Staking-флоу и эталонов
приложения) и runtime-прокликон всех экстринзик-точек (Electron, CDP, кошелёк «оо»). Скриншоты s01–s32 в session
scratchpad; полные отчёты — в транскриптах сессии.

## Что уже в порядке (фиксить не надо)

- Валидации сумм **переиспользуют** те же валидаторы, что и старые флоу: `unstakeValidator`, `bondExtraValidator`,
  `bondNominateValidator`, `withdrawValidator`, `nominateValidator` + общий `createTxValidator` (fee/ED/route/proxy).
  Местами дашборд **строже**: `maxUnlockingChunks`, min-bond на new position (в старом bond-nominate его нет!),
  chill-on-min `<` вместо `lte`, живой `num_slashing_spans`, origin внутреннего вызова = аккаунт позиции (в старых —
  signatory, баг).
- Тексты валидаций dust/min-bond живьём корректны и понятны.
- Confirm достижим для: Claim (из Rewards-модалки, включая Claim all и multi-tx сплит с fee-ошибкой), New position
  (полный путь до enabled «Sign with Nova Wallet»), Change validators (до пикера с «Save as draft»).
- Параметры транзакций — паритет (те же билдеры `transactionBuilder`, batch-формы, payee, page).

## P0 — сломано или опасно

1. **Тихий fallback подписанта во всех 4 флоу** (`$routeSignatory = $signatoryFromPath ?? $initiator`):
   `amount-flow.ts:134`, `confirm-flow.ts:116`, `new-position-flow.ts:199`, `claim.ts:166`. Для unsignable-аккаунта
   маршрут вырождается в self-route, `wrapLegacyTransaction` не оборачивает, `createTxValidator` глотает throw
   (`createTxValidator.ts:163-177`) → `$valid === true` → sign-шаг для аккаунта без ключа. Старые флоу блокировали через
   `noSignatorySelected` + `createSignatoriesStore`. **Фикс:** переиспользовать guard присутствия подписанта на маршруте
   во всех 4 флоу; `createTxValidator`-catch не должен превращать exception в «валидно» (отдельно обсудить — это
   shared-модуль).
2. **Drawer-чип Claim молча no-op для address-book позиций.** `staking-dashboard-actions/model/wiring.ts` →
   `buildPositionClaimRequest` возвращает `null` при `nullable(account) || nullable(wallet)`, `.filterMap` глотает. При
   этом путь через Rewards-модалку ту же позицию обслуживает (resolveClaimRequests подбирает любой signable-аккаунт сети
   — payout permissionless). **Фикс:** чип использует ту же резолюцию инициатора, что и модалка; если подписанта нет —
   чип disabled с тултипом, не no-op.
3. **Unbond / Add stake для контактных позиций — мёртвый тупик без объяснения.** Форма выглядит валидной, Continue
   никогда не включается ( `$tx` null без signing path), `$errors` пуст, `SigningPathSection` скрыт (<2 узлов),
   draft-тумблер скрыт при `address-book-has-ever-connected=false` (`DraftModeCard` → null). Несогласовано с Change
   validators, который для того же аккаунта даёт «Save as draft». **Фикс:** (a) явное сообщение «нет подписанта» вместо
   тихого disabled; (b) единая draft-политика: если у Change validators есть Save as draft — у unbond/add stake тоже
   (включая reconnect-подсказку к external address book, когда бэкенд не подключался).

## P1 — отсутствующие интеграции (эталон — старые staking-конфирмы)

4. **Multisig description field** отсутствует во всех 4 confirm-экранах (`*/ui/Confirmation.tsx`), хотя confirm-store'ы
   уже публикуют `activeOperationRoute` в `aggregates/multisig-operation-description`. **Фикс:** отрендерить
   `MultisigOperationDescriptionField` (как в 24 экранах `OperationsConfirm/*`), показывать при multisig-инициаторе.
5. **`signingMode` вычисляется в drawer'е (`toSigningMode`) и выбрасывается** target-типами amount-flow / confirm-flow /
   claim (у new-position — единственного — доносится). **Фикс:** добавить `signingMode` в `AmountFlowTarget`,
   `ChangeValidatorsTarget`, `RedeemTarget`, `ClaimRequest`; флоу стартует сразу в правильном режиме
   (direct/multisig/draft), а не переугадывает.
6. **`wireDraftSourceBalance` отсутствует** в двух флоу с amount-полем (`staking-amount-flow`,
   `staking-new-position-flow`): в draft-режиме `$reservable` читает баланс инициатора → Max = 0. Эталон:
   `staking-unstake/model/form-model.ts:138`, `transfer/model/form-model.ts:791`.
7. **Claim: extra-транзакции невалидированы** — `$isTxValid`/`$fee`/`$route`/`$canSign` привязаны к `$primaryCoreTx`
   (plan 0), extras оборачиваются default-маршрутом (`claim.ts:229-330,360-367`; признано в README
   `staking-claim-rewards:97-103`). **Фикс:** пер-план валидация + суммарный `$canSign`; fee — сумма по планам, не ×N
   одного.

## P2 — паритет/надёжность

8. **Basket-шаг** отсутствует во всех 4 флоу (в каждом старом — есть). Решение продукта: нужен ли basket на дашборде?
   Если да — добавить `BASKET`-шаг через `aggregates/basket-operations` по образцу
   `staking-unstake/components/Unstake.tsx:39-70`.
9. **Redeem без живой эры:** confirm открывается по данным агрегата; старый withdraw подписывался на
   `subscribeActiveEra` + гейт `isEraLoading` (`staking-withdraw/model/form-model.ts:126-151`). Протухшая цифра может
   открыть confirm с пустым ledger'ом. Плюс `WithdrawRules.amount.noRedeemBalance` мёртв для интерактива.
10. **New-position Sign-гейт слабейший из четырёх:** `disabled={!isTxValid || preparing}` без null-check `$tx`
    (`ui/Confirmation.tsx:115`). Выровнять с `$canSign`-паттерном сиблингов.
11. **Chain-connected guard** (минорно): старые формы гейтят `$isChainConnected`, дашборд-флоу — нет.
12. **Draft can-save у redeem** не требует ненулевого redeemable (старый требует) — минорно.

## P3 — UX/косметика/доки

13. **Over-max / insufficient-balance без текста** (только красная рамка + disabled) во всех amount-формах, при том что
    min-bond/dust имеют развёрнутые сообщения — выровнять.
14. **Drawer-бейдж «LOCAL WALLET» для address-book контактов** — лжёт; должен показывать контактный статус.
15. **Протухший Available при смене кошелька** в new-position (показывает баланс прежнего кошелька, пока не сменишь
    сеть) — пере-резолв на смену активного кошелька.
16. **Доки:** `staking-dashboard-actions/README.md:44` (startStaking → «навигация на Staking page» — неправда),
    `staking-amount-flow/README.md` молчит про пробелы signatory/description/basket; отсутствие redeem-чипа в drawer'е
    (README:116-118) — подтвердить как осознанное или добавить чип.

## Вне скоупа этого плана (отдельные тикеты)

- Живое исчезновение позиции при RPC rate-limit (Positions 3→2 на минуты) — известная слабость
  `aggregates/staking-positions` («failed subscription неотличим от пустого»); чинится редизайном error-state в
  shared/query, не флоу-фиксами.
- Multishard Vault fan-out в new-position — задокументированный продуктовый пробел.
- Отсутствие restake/set-payee действий на дашборде — продуктовое решение, не регрессия.

## Порядок исполнения (предлагаемый)

1. P0.1 + P0.3(a) — guard подписанта + явные сообщения (одна связка, все 4 флоу).
2. P0.2 — claim-чип (резолюция инициатора).
3. P1.5 — signingMode в target-типах (фундамент для 4 и 6).
4. P1.4 — description field (4 конфирма).
5. P1.6 — wireDraftSourceBalance + P0.3(b) draft-политика unbond/add stake.
6. P1.7 — claim extras.
7. P2.8–12 по решению; P3 пакетом в конце.
