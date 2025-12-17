# Инструкция по воспроизведению ошибок Multi-Transfer

## 1. Recipient has less than ED (Recipient has less than ED)

**Описание:** Получатель имеет баланс меньше Existential Deposit (ED), и отправляемая сумма также меньше ED.

**Как воспроизвести:**
1. Выберите сеть (например, Kusama Asset Hub)
2. Создайте CSV файл с адресом получателя, у которого баланс = 0 или меньше ED:
   ```csv
   recipient,amount
   1BcZ2DMitNEXN2uA26tyLrdh7UxQ63tK6jkQmWNdmfSVpFi,1000000000
   ```
   Где `1BcZ2DMitNEXN2uA26tyLrdh7UxQ63tK6jkQmWNdmfSVpFi` - адрес с балансом меньше ED (например, 0 DOT)
   И `1000000000` (0.1 DOT) - сумма меньше ED для DOT (ED для DOT обычно ~1 DOT = 10000000000 planks)
3. Загрузите CSV файл
4. Дождитесь загрузки балансов получателей
5. Ожидаемый результат: Ошибка "Recipient has less than ED" в строке 1

**Примечание:** ED (Existential Deposit) для DOT ≈ 1 DOT (10000000000 planks). Для других сетей ED может отличаться.

---

## 2. Invalid SS58 Address (INVALID_SS58_ADDRESS)

**Описание:** Адрес получателя имеет неверный формат SS58.

**Как воспроизвести:**
1. Выберите сеть
2. Создайте CSV файл с невалидным адресом:
   ```csv
   recipient,amount
   invalid_address_123,10000000000
   5C5BDLw8tzzWB6XQbVPuzeL34d6GmPYPH1NaqsWBaJWzz42J,20000000000
   ```
3. Загрузите CSV файл
4. Ожидаемый результат: Ошибка "Invalid SS58 address format" в строке 1

**Примеры невалидных адресов:**
- `invalid_address_123`
- `12345`
- `0x123...` (Ethereum формат для Polkadot сети)
- Адрес с неправильной контрольной суммой

---

## 3. Invalid Value (INVALID_VALUE)

**Описание:** Значение суммы не является числом или не может быть преобразовано в BN.

**Как воспроизвести:**
1. Выберите сеть
2. Создайте CSV файл с невалидным значением суммы:
   ```csv
   recipient,amount
   5C5BDLw8tzzWB6XQbVPuzeL34d6GmPYPH1NaqsWBaJWzz42J,abc123
   5C5BDLw8tzzWB6XQbVPuzeL34d6GmPYPH1NaqsWBaJWzz42J,10000000000
   ```
3. Загрузите CSV файл
4. Ожидаемый результат: Ошибка "Invalid value" в строке 1 для поля `amount`

**Примеры невалидных значений:**
- `abc123`
- `12.34.56`
- `1e10` (экспоненциальная запись может не поддерживаться)
- Пустое значение

---

## 4. Out of Range (OUT_OF_RANGE)

**Описание:** Сумма находится вне допустимого диапазона (≤ 0 или ≥ MAX_U128).

**Как воспроизвести:**

### 4.1. Сумма равна нулю или отрицательная:
```csv
recipient,amount
5C5BDLw8tzzWB6XQbVPuzeL34d6GmPYPH1NaqsWBaJWzz42J,0
5C5BDLw8tzzWB6XQbVPuzeL34d6GmPYPH1NaqsWBaJWzz42J,-10000000000
```

### 4.2. Сумма превышает MAX_U128 (2^128):
```csv
recipient,amount
5C5BDLw8tzzWB6XQbVPuzeL34d6GmPYPH1NaqsWBaJWzz42J,340282366920938463463374607431768211456
```
Где `340282366920938463463374607431768211456` = 2^128

3. Загрузите CSV файл
4. Ожидаемый результат: Ошибка "Out of range" в соответствующих строках

---

## 5. File Structure Error (STRUCTURE)

**Описание:** CSV файл имеет неверную структуру (неправильные заголовки, отсутствие обязательных колонок).

**Как воспроизвести:**
1. Выберите сеть
2. Создайте CSV файл с неправильными заголовками:
   ```csv
   wrong_column1,wrong_column2
   5C5BDLw8tzzWB6XQbVPuzeL34d6GmPYPH1NaqsWBaJWzz42J,10000000000
   ```
   Или без заголовков:
   ```csv
   5C5BDLw8tzzWB6XQbVPuzeL34d6GmPYPH1NaqsWBaJWzz42J,10000000000
   ```
   Или с неправильным порядком:
   ```csv
   amount,recipient
   10000000000,5C5BDLw8tzzWB6XQbVPuzeL34d6GmPYPH1NaqsWBaJWzz42J
   ```
3. Загрузите CSV файл
4. Ожидаемый результат: Ошибка "File couldn't be read or contains invalid CSV structure. Check column headers and formatting, then try uploading again."

**Правильные заголовки должны быть:**
```csv
recipient,amount
```

---

## 6. CSV Data Parsing Error (DATA)

**Описание:** CSV файл имеет правильную структуру, но содержит синтаксические ошибки в данных (неправильные кавычки, разделители и т.д.).

**Как воспроизвести:**
1. Выберите сеть
2. Создайте CSV файл с синтаксическими ошибками:
   ```csv
   recipient,amount
   "5C5BDLw8tzzWB6XQbVPuzeL34d6GmPYPH1NaqsWBaJWzz42J",10000000000
   "test"address",20000000000
   ```
   Где во второй строке неправильно закрыты кавычки: `"test"address"` вместо `"testaddress"` или `testaddress`
3. Загрузите CSV файл
4. Ожидаемый результат: 
   - Инпут подсвечивается красным
   - В консоли браузера: `multi-transfer CSV parsing error: Invalid Closing Quote`
   - Ошибка "File couldn't be read or contains invalid CSV structure" (если парсер не смог распарсить)

**Другие примеры синтаксических ошибок:**
- Неправильно экранированные кавычки
- Лишние запятые
- Неправильные переносы строк

---

## 7. CAS Validations Above the Form (Transaction-level validations)

**Описание:** Валидации на уровне транзакции, которые показываются в компоненте `TransactionValidationError` над формой.

### 7.1. Insufficient Funds (Недостаточно средств)

**Как воспроизвести:**
1. Выберите сеть
2. Выберите кошелек с недостаточным балансом (например, баланс = 0.5 DOT)
3. Создайте CSV файл с суммами, превышающими баланс + комиссия:
   ```csv
   recipient,amount
   5C5BDLw8tzzWB6XQbVPuzeL34d6GmPYPH1NaqsWBaJWzz42J,100000000000
   ```
   Где `100000000000` = 10 DOT, а баланс кошелька = 0.5 DOT
4. Загрузите CSV файл
5. Ожидаемый результат: 
   - Над формой появляется красный блок с ошибкой:
     ```
     This operation cannot be completed
     Wallet [name] has insufficient funds to cover the sending amount of 10 DOT
     Please top up the balance of this wallet by X DOT and try again.
     ```
   - Кнопка "Continue" задизейблена

### 7.2. Multisig Deposit Required

**Как воспроизвести:**
1. Выберите сеть
2. Выберите multisig кошелек
3. Создайте валидный CSV файл
4. Загрузите CSV файл
5. Ожидаемый результат: 
   - Над формой может появиться информация о необходимом депозите для multisig
   - В секции "Fee" отображается "Multisig Deposit"

---

## 8. Valid Cases (Валидные случаи)

### 8.1. Valid Recipient (Валидный получатель)

**Как воспроизвести:**
```csv
recipient,amount
5C5BDLw8tzzWB6XQbVPuzeL34d6GmPYPH1NaqsWBaJWzz42J,10000000000
```
Где адрес в правильном SS58 формате для выбранной сети.

### 8.2. Valid Amount (Валидная сумма)

**Как воспроизвести:**
```csv
recipient,amount
5C5BDLw8tzzWB6XQbVPuzeL34d6GmPYPH1NaqsWBaJWzz42J,10000000000
```
Где `10000000000` = 1 DOT (для DOT сети) и находится в диапазоне (0 < amount < 2^128).

### 8.3. Valid File Structure (Валидная структура файла)

**Как воспроизвести:**
```csv
recipient,amount
5C5BDLw8tzzWB6XQbVPuzeL34d6GmPYPH1NaqsWBaJWzz42J,10000000000
5C5BDLw8tzzWB6XQbVPuzeL34d6GmPYPH1NaqsWBaJWzz42J,20000000000
```
Где:
- Правильные заголовки: `recipient,amount`
- Правильный порядок колонок
- Все строки имеют правильный формат

---

## Примечания

1. **ED (Existential Deposit)** различается для разных сетей:
   - DOT: ~1 DOT (10000000000 planks)
   - KSM: ~0.0000333333 KSM (333333 planks)
   - Проверьте актуальное значение ED для выбранной сети

2. **MAX_U128** = 2^128 = 340282366920938463463374607431768211456

3. Все ошибки отображаются в красном цвете (error severity)

4. Кнопка "Continue" задизейблена при наличии любых ошибок валидации

5. Preview таблица доступна даже при наличии ошибок (кроме ошибок структуры CSV)

