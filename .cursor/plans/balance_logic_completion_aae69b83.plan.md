---
name: Balance Logic Completion
overview: Close the gaps in `SystemSetting.balance` tracking so every cash-in / cash-out event (paid records, received records, auto-creation of those, and system withdrawal validation) correctly increases or decreases the system balance — mirroring the same pattern already used for deposit and user withdrawal approval.
todos:
  - id: paid-record-balance
    content: "paid_record_views.py: import SystemSetting, decrease balance on create, adjust diff on update, increase on delete"
    status: completed
  - id: received-record-balance
    content: "received_record_views.py: import SystemSetting, increase balance on create, adjust diff on update, decrease on delete"
    status: completed
  - id: purchase-auto-paid
    content: "purchase_views.py: decrease SystemSetting.balance when auto_create_paid_record block runs"
    status: completed
  - id: sales-auto-received
    content: "sales_views.py: increase SystemSetting.balance inside _auto_create_received_record_if_paid"
    status: completed
  - id: system-withdrawal-validation
    content: "withdrawal_views.py: add balance sufficiency check + atomic block in system_withdrawal_approve"
    status: completed
isProject: false
---

# Balance Logic Completion

## Current state (what already works)


| Event                      | `SystemSetting.balance` |
| -------------------------- | ----------------------- |
| Deposit approved           | +amount ✓               |
| User withdrawal approved   | -amount ✓               |
| System withdrawal approved | -amount ✓               |


## Gaps to fix

The following cash flow events do **not** touch `SystemSetting.balance` yet:

- **PaidRecord created** — admin pays vendor (cash out) → balance should **decrease**
- **PaidRecord updated** — amount change → balance should be **adjusted by diff**
- **PaidRecord deleted** — reversal → balance should **increase**
- **ReceivedRecord created** — admin receives cash from customer (cash in) → balance should **increase**
- **ReceivedRecord updated** — amount change → balance should be **adjusted by diff**
- **ReceivedRecord deleted** — reversal → balance should **decrease**
- **Auto-paid record on purchase** (via `auto_create_paid_record`) → same as paid record create
- **Auto-received record on sale** (via `_auto_create_received_record_if_paid`) → same as received record create
- **System withdrawal approve** — no balance sufficiency check before deducting

## Files to change

- `[server/core/views/admin/paid_record_views.py](server/core/views/admin/paid_record_views.py)`
- `[server/core/views/admin/received_record_views.py](server/core/views/admin/received_record_views.py)`
- `[server/core/views/admin/purchase_views.py](server/core/views/admin/purchase_views.py)`
- `[server/core/views/admin/sales_views.py](server/core/views/admin/sales_views.py)`
- `[server/core/views/admin/withdrawal_views.py](server/core/views/admin/withdrawal_views.py)`

## Detailed changes per file

### 1. `paid_record_views.py`

- Add `SystemSetting` import
- **CREATE**: `SystemSetting.objects.update(balance=F('balance') - obj.amount)`
- **PATCH**: `diff = old_amount - new_amount` → `SystemSetting.objects.update(balance=F('balance') + diff)` (only when `diff != 0`)
- **DELETE**: `SystemSetting.objects.update(balance=F('balance') + amount)`

### 2. `received_record_views.py`

- Add `SystemSetting` import
- **CREATE**: `SystemSetting.objects.update(balance=F('balance') + obj.amount)`
- **PATCH**: `diff = new_amount - old_amount` → `SystemSetting.objects.update(balance=F('balance') + diff)` (only when `diff != 0`)
- **DELETE**: `SystemSetting.objects.update(balance=F('balance') - amount)`

### 3. `purchase_views.py` (auto paid record block, lines 139–163)

- After `PaidRecord.objects.create(...)`, add:
`SystemSetting.objects.update(balance=F('balance') - paid_record.amount)`
- Add `SystemSetting` import

### 4. `sales_views.py` (`_auto_create_received_record_if_paid`, lines 127–162)

- After `ReceivedRecord.objects.create(...)`, add:
`SystemSetting.objects.update(balance=F('balance') + record.amount)`
- Add `SystemSetting` import

### 5. `withdrawal_views.py` (`system_withdrawal_approve`, lines 184–199)

- Before deducting balance, check sufficiency:

```python
setting = SystemSetting.objects.select_for_update().first()
if setting and setting.balance < sw.amount:
    return error_response('Insufficient system balance for approval.', status.HTTP_409_CONFLICT, code='LIMIT_VIOLATION')
```

- Wrap the approve block in `transaction.atomic()` (currently missing, unlike user withdrawal)

